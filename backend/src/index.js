require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const devicesRouter = require('./routes/devices');
const logsRouter = require('./routes/logs');
const healthRouter = require('./routes/health');
const { initDb } = require('./services/database');

const app = express();
const PORT = process.env.PORT || 3210;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/logs', logsRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start
initDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bluetooth Scanner API running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
