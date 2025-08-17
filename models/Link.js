const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  ipAddress: String,
  country: String,
  region: String,
  city: String,
  latitude: Number,
  longitude: Number,
  deviceType: String,
  browser: String,
  os: String,
  referrer: String,
  timestamp: { type: Date, default: Date.now }
});

const linkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  originalUrl: String,
  trackingId: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now },
  clicks: [clickSchema]
});

module.exports = mongoose.model('Link', linkSchema);