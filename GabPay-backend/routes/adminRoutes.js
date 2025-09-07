const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Middleware pour vérifier si l'utilisateur est admin
const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier si l'utilisateur est admin
    const [rows] = await db.query('SELECT is_admin FROM users WHERE id = ?', [decodedToken.userId]);
    if (rows.length === 0 || !rows[0].is_admin) {
      return res.status(403).json({ message: 'Accès refusé. Droits administrateur requis.' });
    }
    
    req.userData = { userId: decodedToken.userId };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Authentification échouée.' });
  }
};

// Route pour créer un administrateur
router.post('/create', auth, adminAuth, async (req, res) => {
  const { full_name, email, phone, password } = req.body;

  if (!full_name || !email || !phone || !password) {
    return res.status(400).json({ message: 'Tous les champs sont requis.' });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (full_name, email, phone, password_hash, is_admin) VALUES (?, ?, ?, ?, ?)',
      [full_name, email, phone, password_hash, true]
    );
    res.status(201).json({ message: 'Administrateur créé avec succès.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Cet email ou ce numéro de téléphone est déjà utilisé.' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de l\'administrateur.' });
  }
});

// Route pour lister tous les utilisateurs
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, full_name, email, phone, balance, is_admin, created_at FROM users ORDER BY created_at DESC'
    );
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Échec de la récupération des utilisateurs.' });
  }
});

// Route pour lister toutes les transactions
router.get('/transactions', auth, adminAuth, async (req, res) => {
  try {
    const [transactions] = await db.query(`
      SELECT t.*, 
             u_sender.full_name as sender_name, 
             u_receiver.full_name as receiver_name
      FROM transactions t
      LEFT JOIN users u_sender ON t.sender_id = u_sender.id
      LEFT JOIN users u_receiver ON t.receiver_id = u_receiver.id
      ORDER BY t.created_at DESC
    `);
    res.status(200).json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Échec de la récupération des transactions.' });
  }
});

// Route pour lister toutes les factures
router.get('/bills', auth, adminAuth, async (req, res) => {
  try {
    const [bills] = await db.query(`
      SELECT b.*, u.full_name as user_name
      FROM bills b
      LEFT JOIN users u ON b.user_id = u.id
      ORDER BY b.created_at DESC
    `);
    res.status(200).json(bills);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Échec de la récupération des factures.' });
  }
});

// Route pour créer une facture pour un utilisateur
router.post('/bills/create', auth, adminAuth, async (req, res) => {
  const { user_id, title, description, amount } = req.body;

  if (!user_id || !title || !amount || amount <= 0) {
    return res.status(400).json({ message: 'Tous les champs sont requis et le montant doit être positif.' });
  }

  try {
    await db.query(
      'INSERT INTO bills (user_id, title, description, amount, is_paid) VALUES (?, ?, ?, ?, ?)',
      [user_id, title, description, amount, false]
    );
    res.status(201).json({ message: 'Facture créée avec succès.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la création de la facture.' });
  }
});

// Route pour envoyer une notification à un utilisateur
router.post('/notifications/send', auth, adminAuth, async (req, res) => {
  const { user_id, message } = req.body;

  if (!user_id || !message) {
    return res.status(400).json({ message: 'ID utilisateur et message requis.' });
  }

  try {
    await db.query(
      'INSERT INTO notifications (user_id, message, is_read) VALUES (?, ?, ?)',
      [user_id, message, false]
    );
    res.status(201).json({ message: 'Notification envoyée avec succès.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'envoi de la notification.' });
  }
});

// Route pour obtenir les statistiques générales
router.get('/stats', auth, adminAuth, async (req, res) => {
  try {
    const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
    const [transactionCount] = await db.query('SELECT COUNT(*) as count FROM transactions');
    const [totalTransactions] = await db.query('SELECT SUM(amount) as total FROM transactions WHERE status = "completed"');
    const [billCount] = await db.query('SELECT COUNT(*) as count FROM bills');
    const [unpaidBills] = await db.query('SELECT COUNT(*) as count FROM bills WHERE is_paid = 0');

    res.status(200).json({
      users: userCount[0].count,
      transactions: transactionCount[0].count,
      totalAmount: totalTransactions[0].total || 0,
      bills: billCount[0].count,
      unpaidBills: unpaidBills[0].count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Échec de la récupération des statistiques.' });
  }
});

module.exports = router;
