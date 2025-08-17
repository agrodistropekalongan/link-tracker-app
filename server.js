require('dotenv').config();
const express = require('express');
const geoip = require('geoip-lite');
const useragent = require('useragent');
const cors = require('cors');
const { nanoid } = require('nanoid');
const path = require('path');
const fs = require('fs');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const locationRoutes = require('./routes/location');
app.use('/api', locationRoutes);

// Setup Lowdb
const dbFile = path.join(__dirname, 'data', 'db.json');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { links: [], tracking: [] });

(async () => {
  await db.read();
  db.data ||= { links: [] };

  // Routes
  app.post('/api/links', async (req, res) => {
    try {
      const { originalUrl } = req.body;
      if (!originalUrl) return res.status(400).json({ error: 'URL required' });

      const trackingId = nanoid(10);
      const newLink = {
        originalUrl,
        trackingId,
        createdAt: new Date().toISOString(),
        clicks: []
      };

      db.data.links.push(newLink);
      await db.write();

      res.status(201).json({
        originalUrl,
        trackingId,
        trackingUrl: `${'https://'+process.env.GATE}/r/${trackingId}`,
        createdAt: newLink.createdAt
      });
    } catch (err) {
      console.error('❌ POST /api/links failed:', err);
      res.status(500).json({ error: 'Failed to create link' });
    }
  });

  app.get('/api/links', async (req, res) => {
    res.json(db.data.links.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  });

  app.get('/api/trackings', async (req, res) => {
    res.json(db.data.trackings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
  });

  app.get('/api/trackings/:id/analytics', async (req, res) => {
    const link = db.data.links.find(l => l.trackingId === req.params.id);
    if (!link) 
      //return res.status(404).json({ error: 'Link not found' });
      return null;

    res.json({
      trackingId: link.trackingId,
      timestamp: link.timestamp,
      location: link.location
    });
  });

  app.get('/r/:id', async (req, res) => {
    try {
      const link = db.data.links.find(l => l.trackingId === req.params.id);
      if (!link) return res.status(404).send('Link not found');

      const ip = req.headers['x-forwarded-for'] || req.ip;
      const geo = geoip.lookup(ip);
      const agent = useragent.parse(req.headers['user-agent']);

      console.log(`Tracking click for link ${link.trackingId} from IP ${ip} (${geo?.country || 'Unknown'})`);
      link.clicks.push({
        ipAddress: ip,
        country: geo?.country || 'Unknown',
        region: geo?.region || 'Unknown',
        city: geo?.city || 'Unknown',
        latitude: geo?.ll?.[0] || null,
        longitude: geo?.ll?.[1] || null,
        deviceType: getDeviceType(agent),
        browser: agent.family,
        os: agent.os.family,
        referrer: req.headers['referer'] || 'Direct',
        timestamp: new Date().toISOString()
      });

      //console.log(`Click data for ${link.trackingId}:`, link.clicks[link.clicks.length - 1]);
      await db.write();
      //res.redirect(link.originalUrl);
      //console.log(`Redirecting to original URL: ${link.originalUrl}`);
      const { id } = req.params;
      //console.log(id);

      const entry = db.data.links.find(link => link.trackingId === id);
      //console.log(id, entry);
      
      if (!entry) {
        return res.status(404).send('Link not found');
      }

      //res.sendFile(path.join(__dirname, 'public', 'client.html'));
      //res.redirect(`/track?id=${encodeURIComponent(id)}`);
      res.redirect(`/client.html?id=${encodeURIComponent(id)}`);

    } catch (err) {
      res.status(500).send('Server error');
    }
  });
  
app.get('/track', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'client.html'));
});

app.post('/api/track', express.json(), async (req, res) => {
  const { id, location } = req.body;

  if (!id || !location) {
    return res.status(400).json({ error: 'Missing data' });
  }

  const entry = db.data.links.find(link => link.trackingId === id);
  if (entry.trackings === undefined) 
    entry.trackings = [];
  console.log('Tracking entry:', entry);
  entry.trackings.push({ trackingId: id,  timestamp: Date.now(), location });
  console.log('Tracking done:', entry.trackings.length>0 ? entry.trackings[entry.trackings.length - 1] : null);
  await db.write();
  console.log('Writing db done!');

  res.json({ status: 'ok' });
}); 

app.get('/api/link/:id', async (req, res) => {
  const id = req.params.id;
  console.log('✅ Received ID:', id);

  if (!id || typeof id !== 'string') {
    console.warn('⚠️ Invalid ID');
    return res.status(400).json({ error: 'Missing or invalid ID' });
  }

  if (!db?.data?.links) {
    console.error('❌ db.data.links is undefined');
    return res.status(500).json({ error: 'Database not initialized' });
  }

  const entry = db.data.links.find(link => link.trackingId === id);
  console.log('🔍 Matching entry:', entry);

  if (!entry) {
    return res.status(404).json({ error: 'Link not found' });
  }

  res.json({ originalUrl: entry.originalUrl });
});


  app.get('/api/links/:id/analytics', async (req, res) => {
    const link = db.data.links.find(l => l.trackingId === req.params.id);
    if (!link) return res.status(404).json({ error: 'Link not found' });

    res.json({
      trackingId: link.trackingId,
      originalUrl: link.originalUrl,
      totalClicks: link.clicks.length,
      byCountry: countByField(link.clicks, 'country'),
      byDevice: countByField(link.clicks, 'deviceType'),
      clickData: link.clicks
    });
  });

  // Helpers
  function getDeviceType(agent) {
    if (agent.device.family === 'iPhone' || agent.device.family === 'iPad') return 'Mobile';
    if (agent.device.family === 'Android') return 'Mobile';
    return agent.device.family || 'Desktop';
  }

  function countByField(arr, field) {
    return arr.reduce((acc, item) => {
      const key = item[field] || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }
  app.get('/test', (req, res) => {
    console.log('Test route hit');
    res.send('OK');
  });

  // Serve frontend
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})();
