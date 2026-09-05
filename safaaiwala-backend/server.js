const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const ewasteRoutes = require('./routes/ewasteRoutes');

const app = express();

// Configuration: Support both MONGODB_URI and MONGO_URI
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safaaiwala';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Middleware
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Healthcheck Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'SafaaiWala Backend API',
    timestamp: new Date().toISOString(),
    mongoConnected: mongoose.connection.readyState === 1
  });
});

// Mount Routes under /api/v1
app.use('/api/v1', ewasteRoutes);

// Root Welcome Endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to SafaaiWala AI & CPCB EPR Recycler Platform API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      analyze: 'POST /api/v1/analyze',
      voice: 'POST /api/v1/voice',
      handover: 'POST /api/v1/handover',
      catalog: 'GET /api/v1/catalog',
      recyclers: 'GET /api/v1/recyclers'
    }
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.url}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// MongoDB Connection & Server Initialization
function startListening() {
  const server = app.listen(PORT, () => {
    console.log(`[SafaaiWala Backend] Running on http://localhost:${PORT}`);
    console.log(`[API Routes] Mounted under http://localhost:${PORT}/api/v1`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[Port Conflict] Port ${PORT} is already in use by another process!`);
      console.error(`To free port ${PORT}, run: npx kill-port ${PORT}`);
      console.error(`Or change PORT=5000 in your .env file.\n`);
    } else {
      console.error('[Server Error]:', err);
    }
  });
}

// MongoDB Connection & Server Initialization
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`[MongoDB] Connected successfully to: ${MONGO_URI.replace(/:([^:@]+)@/, ':****@')}`);
    startListening();
  })
  .catch((err) => {
    console.error('[MongoDB Connection Error]:', err.message);
    startListening();
  });

module.exports = app;
