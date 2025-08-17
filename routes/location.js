// routes/location.js
const express = require('express');
const router = express.Router();
const db = require('../data/db'); // assuming Lowdb is initialized here

router.post('/location', (req, res) => {
  const { latitude, longitude, timestamp } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  db.get('locations')
    .push({ latitude, longitude, timestamp: timestamp || Date.now() })
    .write();

  res.json({ status: 'Location saved' });
});

module.exports = router;