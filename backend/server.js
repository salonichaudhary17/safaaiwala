const express = require("express");
const cors = require("cors");

const materialsRouter = require("./routes/materials");
const priceRouter = require("./routes/price");
const recyclersRouter = require("./routes/recyclers");
const lotsRouter = require("./routes/lots");
const transactionsRouter = require("./routes/transactions");
const ledgerRouter = require("./routes/ledger");
const assistantRouter = require("./routes/assistant");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true, service: "safaaiwala-backend" }));

app.use("/api/materials", materialsRouter);
app.use("/api/price", priceRouter);
app.use("/api/recyclers", recyclersRouter);
app.use("/api/lots", lotsRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/ledger", ledgerRouter);
app.use("/api/assistant", assistantRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`SafaaiWala backend running on http://localhost:${PORT}`);
});
