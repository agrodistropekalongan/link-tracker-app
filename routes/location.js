// routes/location.js
import express from 'express';
import db from '../data/db.js'; // 👈 note the `.js` extension

const router = express.Router();

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

//module.exports = router;
export default router;
