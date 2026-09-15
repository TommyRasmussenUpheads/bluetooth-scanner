const express = require('express');
const router = express.Router();
const { getDb } = require('../services/database');

// POST /api/logs - mottar applogger fra Android-appen
router.post('/', (req, res) => {
  try {
    const { scanner_id, logs } = req.body;

    if (!scanner_id || !logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: 'scanner_id and logs array required' });
    }

    const db = getDb();
    const insert = db.prepare(`
      INSERT INTO app_logs (scanner_id, level, message, timestamp, extra)
      VALUES (@scanner_id, @level, @message, @timestamp, @extra)
    `);

    const insertMany = db.transaction((logs) => {
      for (const log of logs) {
        insert.run({
          scanner_id,
          level: log.level || 'info',
          message: log.message,
          timestamp: log.timestamp || new Date().toISOString(),
          extra: log.extra ? JSON.stringify(log.extra) : null
        });
      }
    });

    insertMany(logs);
    res.json({ success: true, received: logs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs - hent logger
router.get('/', (req, res) => {
  try {
    const { scanner_id, level, limit = 200, offset = 0 } = req.query;
    const db = getDb();

    let query = 'SELECT * FROM app_logs WHERE 1=1';
    const params = [];

    if (scanner_id) { query += ' AND scanner_id = ?'; params.push(scanner_id); }
    if (level) { query += ' AND level = ?'; params.push(level); }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const logs = db.prepare(query).all(...params);
    res.json({ logs, limit, offset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/logs/alert - mottar varslingseventer
router.post('/alert', (req, res) => {
  try {
    const { scanner_id, mac_address, alert_type, message } = req.body;

    if (!scanner_id || !mac_address || !alert_type) {
      return res.status(400).json({ error: 'scanner_id, mac_address and alert_type required' });
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO alerts (scanner_id, mac_address, alert_type, message, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(scanner_id, mac_address, alert_type, message || null, new Date().toISOString());

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
