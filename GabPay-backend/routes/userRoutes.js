const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const auth = require('../middleware/auth'); // AJOUTÉ : Middleware pour l'authentification

// Route d'inscription
router.post('/register', async (req, res) => {
  const { full_name, email, phone, password } = req.body;

  // Validation des champs
  if (!full_name || !email || !phone || !password) {
    return res.status(400).json({ message: 'Tous les champs sont requis.' });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (full_name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
      [full_name, email, phone, password_hash]
    );
    res.status(201).json({ message: 'Utilisateur enregistré avec succès.' });
  } catch (error) {
    // Gestion des erreurs de doublons
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Cet email ou ce numéro de téléphone est déjà utilisé.' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement.' });
  }
});

// Route de connexion
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe sont requis.' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token, user: { id: user.id, full_name: user.full_name, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion.' });
  }
});

// NOUVELLE ROUTE AJOUTÉE : Récupérer le profil de l'utilisateur
router.get('/profile', auth, async (req, res) => {
  const userId = req.userData.userId; // L'ID de l'utilisateur est dans le token
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, email, phone, balance FROM users WHERE id = ?',
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Échec de la récupération du profil.' });
  }
});

module.exports = router;