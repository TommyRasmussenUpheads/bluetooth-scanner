const express = require('express');
const router = express.Router();
const { getDb } = require('../services/database');

// POST /api/devices - mottar liste med skannede enheter fra appen
router.post('/', (req, res) => {
  try {
    const { scanner_id, devices, timestamp } = req.body;

    if (!scanner_id || !devices || !Array.isArray(devices)) {
      return res.status(400).json({ error: 'scanner_id and devices array required' });
    }

    const db = getDb();
    const now = timestamp || new Date().toISOString();

    const upsertDevice = db.prepare(`
      INSERT INTO devices (mac_address, device_name, device_type, rssi, is_ble,
                           manufacturer_data, service_uuids, first_seen, last_seen,
                           scanner_id, location_lat, location_lng)
      VALUES (@mac_address, @device_name, @device_type, @rssi, @is_ble,
              @manufacturer_data, @service_uuids, @first_seen, @last_seen,
              @scanner_id, @location_lat, @location_lng)
      ON CONFLICT(mac_address, scanner_id) DO UPDATE SET
        device_name = COALESCE(excluded.device_name, device_name),
        rssi = excluded.rssi,
        last_seen = excluded.last_seen,
        location_lat = excluded.location_lat,
        location_lng = excluded.location_lng
    `);

    const insertEvent = db.prepare(`
      INSERT INTO scan_events (scanner_id, device_mac, device_name, rssi, is_ble, timestamp, location_lat, location_lng)
      VALUES (@scanner_id, @device_mac, @device_name, @rssi, @is_ble, @timestamp, @location_lat, @location_lng)
    `);

    const insertMany = db.transaction((devices) => {
      for (const device of devices) {
        upsertDevice.run({
          mac_address: device.mac_address,
          device_name: device.name || null,
          device_type: device.type || 'unknown',
          rssi: device.rssi || null,
          is_ble: device.is_ble ? 1 : 0,
          manufacturer_data: device.manufacturer_data ? JSON.stringify(device.manufacturer_data) : null,
          service_uuids: device.service_uuids ? JSON.stringify(device.service_uuids) : null,
          first_seen: now,
          last_seen: now,
          scanner_id,
          location_lat: device.location_lat || null,
          location_lng: device.location_lng || null
        });

        insertEvent.run({
          scanner_id,
          device_mac: device.mac_address,
          device_name: device.name || null,
          rssi: device.rssi || null,
          is_ble: device.is_ble ? 1 : 0,
          timestamp: now,
          location_lat: device.location_lat || null,
          location_lng: device.location_lng || null
        });
      }
    });

    insertMany(devices);

    res.json({
      success: true,
      received: devices.length,
      scanner_id,
      timestamp: now
    });
  } catch (err) {
    console.error('Error storing devices:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/devices - hent alle kjente enheter
router.get('/', (req, res) => {
  try {
    const { scanner_id, limit = 100, offset = 0 } = req.query;
    const db = getDb();

    let query = 'SELECT * FROM devices';
    const params = [];

    if (scanner_id) {
      query += ' WHERE scanner_id = ?';
      params.push(scanner_id);
    }

    query += ' ORDER BY last_seen DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const devices = db.prepare(query).all(...params);
    const total = db.prepare(scanner_id
      ? 'SELECT COUNT(*) as count FROM devices WHERE scanner_id = ?'
      : 'SELECT COUNT(*) as count FROM devices'
    ).get(...(scanner_id ? [scanner_id] : []));

    res.json({ devices, total: total.count, limit, offset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/devices/:mac - detaljer om en enhet
router.get('/:mac', (req, res) => {
  try {
    const db = getDb();
    const device = db.prepare('SELECT * FROM devices WHERE mac_address = ?').get(req.params.mac);

    if (!device) return res.status(404).json({ error: 'Device not found' });

    const events = db.prepare(
      'SELECT * FROM scan_events WHERE device_mac = ? ORDER BY timestamp DESC LIMIT 50'
    ).all(req.params.mac);

    res.json({ device, recent_events: events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
