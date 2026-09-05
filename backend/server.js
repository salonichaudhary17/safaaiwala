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
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// MongoDB Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/safaaiwala';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error:', err));

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