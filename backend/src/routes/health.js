const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'bluetooth-scanner-api',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;
