const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Route pour voir le solde d'épargne
router.get('/', auth, async (req, res) => {
  const userId = req.userData.userId;
  try {
    const [rows] = await db.query('SELECT balance FROM savings WHERE user_id = ?', [userId]);
    const balance = rows[0] ? rows[0].balance : 0;
    res.status(200).json({ balance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Échec de la récupération du solde d\'épargne.' });
  }
});

// Route pour déposer de l'argent sur le compte d'épargne
router.post('/deposit', auth, async (req, res) => {
  const { amount } = req.body;
  const userId = req.userData.userId;
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Montant valide requis.' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Vérifier le solde de l'utilisateur
    const [userRows] = await connection.query('SELECT balance FROM users WHERE id = ?', [userId]);
    const user = userRows[0];
    if (user.balance < amount) {
      await connection.rollback();
      return res.status(400).json({ message: 'Solde principal insuffisant.' });
    }

    // 2. Mettre à jour les soldes (principal et épargne)
    await connection.query('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId]);
    const [savingsResult] = await connection.query('INSERT INTO savings (user_id, balance) VALUES (?, ?) ON DUPLICATE KEY UPDATE balance = balance + ?', [userId, amount, amount]);

    await connection.commit();
    res.status(200).json({ message: 'Dépôt sur le compte d\'épargne réussi.' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Échec du dépôt d\'épargne.' });
  } finally {
    connection.release();
  }
});

// Route pour retirer de l'argent du compte d'épargne
router.post('/withdraw', auth, async (req, res) => {
  const { amount } = req.body;
  const userId = req.userData.userId;
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Montant valide requis.' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const [savingsRows] = await connection.query('SELECT balance FROM savings WHERE user_id = ?', [userId]);
    const savings = savingsRows[0];

    if (!savings || savings.balance < amount) {
      await connection.rollback();
      return res.status(400).json({ message: 'Solde d\'épargne insuffisant.' });
    }

    // 2. Mettre à jour les soldes (épargne et principal)
    await connection.query('UPDATE savings SET balance = balance - ? WHERE user_id = ?', [amount, userId]);
    await connection.query('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, userId]);

    await connection.commit();
    res.status(200).json({ message: 'Retrait du compte d\'épargne réussi.' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: 'Échec du retrait d\'épargne.' });
  } finally {
    connection.release();
  }
});

module.exports = router;