const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Route pour récupérer les notifications non lues d'un utilisateur
router.get('/', auth, async (req, res) => {
  const userId = req.userData.userId;

  try {
    const [notifications] = await db.query(
      'SELECT message, is_read, created_at FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC',
      [userId]
    );

    res.status(200).json(notifications);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Échec de la récupération des notifications.' });
  }
});

module.exports = router;