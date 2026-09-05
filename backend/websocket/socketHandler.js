import { Server } from 'socket.io';

let io;

export const initWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    // Join a room based on the user ID (Collector or Aggregator)
    socket.on('join_room', (userId) => {
      socket.join(userId);
    });

    // Notify aggregator of incoming transaction
    socket.on('initiate_handover', (data) => {
      const { aggregatorId, transactionData } = data;
      io.to(aggregatorId).emit('handover_requested', transactionData);
    });

    // Notify collector when aggregator completes payment/verification
    socket.on('complete_handover', (data) => {
      const { collectorId, transactionId, status } = data;
      io.to(collectorId).emit('handover_completed', { transactionId, status });
    });

    socket.on('disconnect', () => {
      // Automatic cleanup on disconnect
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};