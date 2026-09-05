let ioInstance = null;
const sseClients = new Set();

function setIO(io) {
  ioInstance = io;
}

function getIO() {
  return ioInstance;
}

function addSseClient(res) {
  sseClients.add(res);
  res.on("close", () => {
    sseClients.delete(res);
  });
}

function broadcastPrices(payload) {
  if (ioInstance) {
    ioInstance.emit("price:update", payload);
    ioInstance.emit("aajKaBhaav", payload);
  }

  const chunk = `event: price\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(chunk);
    } catch {
      sseClients.delete(res);
    }
  }
}

function emitTransaction(eventName, payload) {
  if (!ioInstance) return;
  ioInstance.emit(eventName, payload);
  if (payload?.recyclerId) {
    ioInstance.to(`recycler:${payload.recyclerId}`).emit(eventName, payload);
  }
  if (payload?.collectorId) {
    ioInstance.to(`collector:${payload.collectorId}`).emit(eventName, payload);
  }
  if (payload?.userId) {
    ioInstance.to(`user:${payload.userId}`).emit(eventName, payload);
  }
}

module.exports = {
  setIO,
  getIO,
  addSseClient,
  broadcastPrices,
  emitTransaction,
};
