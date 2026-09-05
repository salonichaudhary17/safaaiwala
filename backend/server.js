require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");

const { connectMongoDB, disconnectMongoDB } = require("./config/db");
const { seedPlatform } = require("./utils/seedPlatform");
const { setIO, broadcastPrices } = require("./utils/realtime");
const { Price } = require("./models/Schemas");
const { latestPricesForCity } = require("./controllers/wasteController");

const materialsRouter = require("./routes/materials");
const priceRouter = require("./routes/price");
const recyclersRouter = require("./routes/recyclers");
const lotsRouter = require("./routes/lots");
const ledgerRouter = require("./routes/ledger");
const assistantRouter = require("./routes/assistant");
const authRoutes = require("./routes/authRoutes");
const wasteRoutes = require("./routes/wasteRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const recyclerRoutes = require("./routes/recyclerRoutes");

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((item) => item.trim())
  : true;

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: "16mb" }));
app.use(express.urlencoded({ extended: true, limit: "16mb" }));
app.disable("x-powered-by");

const io = new Server(server, {
  cors: {
    origin: allowedOrigins === true ? "*" : allowedOrigins,
    methods: ["GET", "POST", "PATCH"],
    credentials: true,
  },
});

setIO(io);

io.on("connection", (socket) => {
  socket.on("join_room", (roomId) => {
    if (roomId) socket.join(String(roomId));
  });

  socket.on("join", (payload) => {
    if (!payload) return;
    if (payload.userId) socket.join(`user:${payload.userId}`);
    if (payload.collectorId) socket.join(`collector:${payload.collectorId}`);
    if (payload.recyclerId) socket.join(`recycler:${payload.recyclerId}`);
    if (payload.city) socket.join(`city:${payload.city}`);
  });

  socket.on("subscribe:prices", (city) => {
    socket.join(`prices:${city || "all"}`);
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

app.get("/api/health", async (req, res) => {
  const mongoose = require("mongoose");
  const databaseHealthy = mongoose.connection.readyState === 1;

  res.status(databaseHealthy ? 200 : 503).json({
    ok: databaseHealthy,
    service: "safaaiwala-backend",
    database: databaseHealthy ? "connected" : "disconnected",
    realtime: Boolean(io),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/waste", wasteRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/portal", recyclerRoutes);
app.use("/api/materials", materialsRouter);
app.use("/api/price", priceRouter);
app.use("/api/recyclers", recyclersRouter);
app.use("/api/lots", lotsRouter);
app.use("/api/ledger", ledgerRouter);
app.use("/api/assistant", assistantRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((error, req, res, next) => {
  console.error("Unhandled API error:", error);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = Number(process.env.PORT || 4000);

async function tickLivePrices() {
  const prices = await Price.find({ active: true });
  if (!prices.length) return;

  for (const price of prices) {
    const jitter = 1 + (Math.random() * 0.03 - 0.015);
    const nextRate = Number(
      Math.max(1, (price.currentRate || price.buyingPricePerKg) * jitter).toFixed(2)
    );
    if (nextRate > (price.currentRate || 0) + 0.05) price.trend = "up";
    else if (nextRate < (price.currentRate || 0) - 0.05) price.trend = "down";
    else price.trend = "stable";
    price.currentRate = nextRate;
    price.buyingPricePerKg = nextRate;
    price.lastUpdated = new Date();
    await price.save();
  }

  const snapshot = await latestPricesForCity(null);
  broadcastPrices({
    city: "All India",
    generatedAt: new Date().toISOString(),
    prices: snapshot,
  });
}

async function start() {
  try {
    await connectMongoDB();
    await seedPlatform();

    server.listen(PORT, () => {
      console.log(`SafaaiWala backend running on port ${PORT}`);
    });

    const intervalMs = Number(process.env.PRICE_TICK_MS || 15000);
    setInterval(() => {
      tickLivePrices().catch((error) => {
        console.error("Price tick failed:", error.message);
      });
    }, intervalMs);
  } catch (error) {
    console.error("Backend startup failed:", error);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`);
  server.close(async () => {
    try {
      await disconnectMongoDB();
      process.exit(0);
    } catch (error) {
      console.error("Shutdown error:", error);
      process.exit(1);
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start();
