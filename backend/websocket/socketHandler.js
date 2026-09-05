const { Server } = require("socket.io");
const { setIO, getIO } = require("../utils/realtime");

function initWebSocket(server, corsOrigin) {
  const io = new Server(server, {
    cors: {
      origin: corsOrigin || "*",
      methods: ["GET", "POST"],
    },
  });

  setIO(io);

  io.on("connection", (socket) => {
    socket.on("join_room", (userId) => {
      if (userId) socket.join(String(userId));
    });

    socket.on("initiate_handover", (data) => {
      const { aggregatorId, transactionData } = data || {};
      if (aggregatorId) {
        io.to(aggregatorId).emit("handover_requested", transactionData);
      }
    });

    socket.on("complete_handover", (data) => {
      const { collectorId, transactionId, status } = data || {};
      if (collectorId) {
        io.to(collectorId).emit("handover_completed", { transactionId, status });
      }
    });
  });

  return io;
}

module.exports = {
  initWebSocket,
  getIO,
};
