const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth'); 
const { v4: uuidv4 } = require('uuid');

// Route pour envoyer de l'argent (votre code existant)
router.post('/', auth, async (req, res) => {
  const { receiver_phone, amount } = req.body;
  const sender_id = req.userData.userId;

  if (!receiver_phone || !amount || amount <= 0) {
    return res.status(400).json({ message: 'Destinataire et montant valides requis.' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [senderRows] = await connection.query('SELECT balance FROM users WHERE id = ?', [sender_id]);
    const sender = senderRows[0];
    if (sender.balance < amount) {
      await connection.rollback();
      return res.status(400).json({ message: 'Solde insuffisant.' });
    }

    const [receiverRows] = await connection.query('SELECT id FROM users WHERE phone = ?', [receiver_phone]);
    const receiver = receiverRows[0];
    if (!receiver) {
      await connection.rollback();
      return res.status(404).json({ message: 'Destinataire non trouvé.' });
    }
    const receiver_id = receiver.id;

    await connection.query('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, sender_id]);
    await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, receiver_id]);

    await connection.query(
      'INSERT INTO transactions (sender_id, receiver_id, amount, status, type) VALUES (?, ?, ?, ?, ?)',
      [sender_id, receiver_id, amount, 'completed', 'transfer']
    );

    await connection.commit();
    res.status(200).json({ message: 'Transaction réussie !' });

  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Échec de la transaction.' });
  } finally {
    connection.release();
  }
});

// Route pour consulter l'historique des transactions (VERSION CORRIGÉE)
router.get('/history', auth, async (req, res) => {
  const userId = req.userData.userId;
  try {
    const [rows] = await db.query(
      'SELECT t.id, t.amount, t.status, t.created_at, u_sender.id AS sender_id, u_sender.full_name AS sender_name, u_receiver.id AS receiver_id, u_receiver.full_name AS receiver_name ' +
      'FROM transactions AS t ' +
      'INNER JOIN users AS u_sender ON t.sender_id = u_sender.id ' +
      'INNER JOIN users AS u_receiver ON t.receiver_id = u_receiver.id ' +
      'WHERE t.sender_id = ? OR t.receiver_id = ? ' +
      'ORDER BY t.created_at DESC',
      [userId, userId]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Échec de la récupération de l\'historique.' });
  }
});

// Route pour générer un QR code de paiement
router.post('/generate-qr', auth, async (req, res) => {
  const { amount, receiver_phone } = req.body;
  const sender_id = req.userData.userId;

  if (!amount || !receiver_phone || amount <= 0) {
    return res.status(400).json({ message: 'Montant et destinataire valides requis.' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Vérifier que l'expéditeur a un solde suffisant
    const [senderRows] = await connection.query('SELECT balance FROM users WHERE id = ?', [sender_id]);
    const sender = senderRows[0];
    if (sender.balance < amount) {
      await connection.rollback();
      return res.status(400).json({ message: 'Solde insuffisant.' });
    }

    // Vérifier que le destinataire existe
    const [receiverRows] = await connection.query('SELECT id FROM users WHERE phone = ?', [receiver_phone]);
    const receiver = receiverRows[0];
    if (!receiver) {
      await connection.rollback();
      return res.status(404).json({ message: 'Destinataire non trouvé.' });
    }

    // Générer un UUID unique pour le QR code
    const qr_code = uuidv4();

    // Créer la transaction en statut "pending"
    await connection.query(
      'INSERT INTO transactions (sender_id, receiver_id, amount, status, type, qr_code) VALUES (?, ?, ?, ?, ?, ?)',
      [sender_id, receiver.id, amount, 'pending', 'qr_transfer', qr_code]
    );

    await connection.commit();
    res.status(200).json({ 
      message: 'QR code généré avec succès.',
      qr_code: qr_code,
      amount: amount,
      receiver_phone: receiver_phone
    });

  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Échec de la génération du QR code.' });
  } finally {
    connection.release();
  }
});

// Route pour valider et payer via QR code
router.post('/validate-qr', auth, async (req, res) => {
  const { qr_code } = req.body;
  const receiver_id = req.userData.userId;

  if (!qr_code) {
    return res.status(400).json({ message: 'Code QR requis.' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Récupérer la transaction en attente
    const [transactionRows] = await connection.query(
      'SELECT * FROM transactions WHERE qr_code = ? AND status = "pending"',
      [qr_code]
    );
    const transaction = transactionRows[0];

    if (!transaction) {
      await connection.rollback();
      return res.status(404).json({ message: 'QR code invalide ou déjà utilisé.' });
    }

    // Vérifier que le destinataire correspond
    if (transaction.receiver_id !== receiver_id) {
      await connection.rollback();
      return res.status(403).json({ message: 'Ce QR code ne vous est pas destiné.' });
    }

    // Vérifier le solde de l'expéditeur
    const [senderRows] = await connection.query('SELECT balance FROM users WHERE id = ?', [transaction.sender_id]);
    const sender = senderRows[0];
    if (sender.balance < transaction.amount) {
      await connection.rollback();
      return res.status(400).json({ message: 'Solde de l\'expéditeur insuffisant.' });
    }

    // Effectuer le transfert
    await connection.query('UPDATE users SET balance = balance - ? WHERE id = ?', [transaction.amount, transaction.sender_id]);
    await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [transaction.amount, transaction.receiver_id]);

    // Marquer la transaction comme complétée
    await connection.query('UPDATE transactions SET status = "completed" WHERE qr_code = ?', [qr_code]);

    await connection.commit();
    res.status(200).json({ message: 'Paiement via QR code réussi !' });

  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Échec du paiement via QR code.' });
  } finally {
    connection.release();
  }
});

module.exports = router;