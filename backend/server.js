const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const wasteController = require('./controllers/wasteController');
const transactionController = require('./controllers/transactionController');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('socketio', io);

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4000',
  'http://localhost:5000',
  'https://kabadiwala-connect.netlify.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl) or allowed origins
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.netlify.app')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for development/hackathon demo
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB Connection: Support both MONGODB_URI and MONGO_URI
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safaaiwala';
const maxPoolSize = parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) || 10;

mongoose.connect(MONGO_URI, { maxPoolSize })
  .then(() => console.log(`[MongoDB] Connected successfully to: ${MONGO_URI.replace(/:([^:@]+)@/, ':****@')}`))
  .catch(err => console.log('[MongoDB Connection Error]:', err.message));

// Routes
app.post('/api/waste/classify', wasteController.classifyWaste);
app.get('/api/waste/prices', wasteController.getLivePrices);
app.post('/api/transactions', transactionController.createTransaction);
app.get('/api/transactions/:id', transactionController.getTransactionById);

// WebSocket Connections for Dynamic Price Fluctuations ("Aaj Ka Bhaav")
io.on('connection', (socket) => {
  console.log('Client connected to Socket.io:', socket.id);

  // Broadcast price fluctuations every 15 seconds
  const priceInterval = setInterval(() => {
    const updatedPrices = [
      { id: '1', material: 'Copper Wire', category: 'e-waste', currentRate: Math.floor(400 + Math.random() * 40), trend: Math.random() > 0.5 ? 'up' : 'down' },
      { id: '2', material: 'Aluminium Scrap', category: 'metal', currentRate: Math.floor(140 + Math.random() * 15), trend: Math.random() > 0.5 ? 'up' : 'down' },
      { id: '3', material: 'PET Plastic', category: 'plastic', currentRate: Math.floor(25 + Math.random() * 8), trend: Math.random() > 0.5 ? 'up' : 'down' },
      { id: '4', material: 'Printed Circuit Boards', category: 'e-waste', currentRate: Math.floor(175 + Math.random() * 25), trend: 'up' }
    ];
    socket.emit('price_update', updatedPrices);
  }, 15000);

  socket.on('disconnect', () => {
    clearInterval(priceInterval);
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Safaaiwala Backend Server running on port ${PORT}`);
});