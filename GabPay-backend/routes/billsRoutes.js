  const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth'); // Middleware d'authentification

// Route pour consulter TOUTES les factures d'un utilisateur
router.get('/', auth, async (req, res) => {
  const userId = req.userData.userId;
  try {
    const [bills] = await db.query('SELECT * FROM bills WHERE user_id = ?', [userId]);
    res.status(200).json(bills);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Échec de la récupération des factures.' });
  }
});

// Route pour récupérer UNIQUEMENT les factures impayées
router.get('/unpaid', auth, async (req, res) => {
  const userId = req.userData.userId;

  try {
    const [unpaidBills] = await db.query(
      'SELECT * FROM bills WHERE user_id = ? AND is_paid = 0',
      [userId]
    );

    res.status(200).json(unpaidBills);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Échec de la récupération des factures impayées.' });
  }
});

// Route pour payer une facture
router.post('/pay', auth, async (req, res) => {
  const { bill_id } = req.body;
  const userId = req.userData.userId;

  if (!bill_id) {
    return res.status(400).json({ message: 'ID de facture requis.' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Récupérer la facture et l'utilisateur
    const [billRows] = await connection.query('SELECT amount, is_paid FROM bills WHERE id = ? AND user_id = ?', [bill_id, userId]);
    const bill = billRows[0];
    if (!bill || bill.is_paid) {
      await connection.rollback();
      return res.status(404).json({ message: 'Facture non trouvée ou déjà payée.' });
    }

    const [userRows] = await connection.query('SELECT balance FROM users WHERE id = ?', [userId]);
    const user = userRows[0];
    if (user.balance < bill.amount) {
      await connection.rollback();
      return res.status(400).json({ message: 'Solde insuffisant pour payer la facture.' });
    }

    // 2. Débiter le solde de l'utilisateur
    await connection.query('UPDATE users SET balance = balance - ? WHERE id = ?', [bill.amount, userId]);

    // 3. Marquer la facture comme payée
    await connection.query('UPDATE bills SET is_paid = 1 WHERE id = ?', [bill_id]);

    // 4. Enregistrer la transaction
    await connection.query('INSERT INTO transactions (sender_id, receiver_id, amount, status, type) VALUES (?, ?, ?, ?, ?)', [userId, userId, bill.amount, 'completed', 'bill_payment']);

    await connection.commit();
    res.status(200).json({ message: 'Facture payée avec succès.' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Échec du paiement de la facture.' });
  } finally {
    connection.release();
  }
});

module.exports = router;