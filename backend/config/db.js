const mongoose = require("mongoose");

let connected = false;

async function connectMongoDB() {
  if (connected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing. Add it to backend/.env");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri, {
    maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 10),
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  connected = true;

  console.log(
    `MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`
  );

  return mongoose.connection;
}

async function disconnectMongoDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  connected = false;
}

module.exports = {
  connectMongoDB,
  disconnectMongoDB,
};
