const http = require("http");
const express = require("express");
const cors = require("cors");
const { initWebSocket } = require("./websocket/socketHandler");

// Existing routes
const materialsRouter = require("./routes/materials");
const priceRouter = require("./routes/price");
const recyclersRouter = require("./routes/recyclers");
const lotsRouter = require("./routes/lots");
const transactionsRouter = require("./routes/transactions");
const ledgerRouter = require("./routes/ledger");
const assistantRouter = require("./routes/assistant");

// New real-time & spatial routes
const spatialRouter = require("./routes/spatial");
const handoverRouter = require("./routes/handover");

const app = express();
const server = http.createServer(app);

// Initialize Socket.io WebSockets
initWebSocket(server);

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Health Check
app.get("/api/health", (req, res) =>
  res.json({ ok: true, service: "safaaiwala-backend" })
);

// Route Middleware Registration
app.use("/api/materials", materialsRouter);
app.use("/api/price", priceRouter);
app.use("/api/recyclers", recyclersRouter);
app.use("/api/lots", lotsRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/ledger", ledgerRouter);
app.use("/api/assistant", assistantRouter);

// Spatial and Handover verification endpoints
app.use("/api/centers", spatialRouter);
app.use("/api/handover", handoverRouter);

const PORT = process.env.PORT || 4000;

// Listen using the HTTP server wrapper (required for Socket.io)
server.listen(PORT, () => {
  console.log(`SafaaiWala backend running on http://localhost:${PORT}`);
});
