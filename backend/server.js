require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");

const {
  connectMongoDB,
  disconnectMongoDB,
} = require("./utils/mongoose");

const materialsRouter = require("./routes/materials");
const priceRouter = require("./routes/price");
const recyclersRouter = require("./routes/recyclers");
const lotsRouter = require("./routes/lots");
const transactionsRouter = require("./routes/transactions");
const ledgerRouter = require("./routes/ledger");
const assistantRouter = require("./routes/assistant");

const app = express();
const server = http.createServer(app);

const allowedOrigins =
  process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN
        .split(",")
        .map((item) => item.trim())
    : true;

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "8mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "8mb",
  })
);

app.disable("x-powered-by");

app.get("/api/health", async (req, res) => {
  const mongoose =
    require("mongoose");

  const databaseHealthy =
    mongoose.connection.readyState === 1;

  res.status(
    databaseHealthy ? 200 : 503
  ).json({
    ok: databaseHealthy,
    service:
      "safaaiwala-backend",
    database:
      databaseHealthy
        ? "connected"
        : "disconnected",
    timestamp:
      new Date().toISOString(),
  });
});

app.use(
  "/api/materials",
  materialsRouter
);

app.use(
  "/api/price",
  priceRouter
);

app.use(
  "/api/recyclers",
  recyclersRouter
);

app.use(
  "/api/lots",
  lotsRouter
);

app.use(
  "/api/transactions",
  transactionsRouter
);

app.use(
  "/api/ledger",
  ledgerRouter
);

app.use(
  "/api/assistant",
  assistantRouter
);

app.use(
  (req, res) => {
    res.status(404).json({
      error: "Route not found",
    });
  }
);

app.use(
  (error, req, res, next) => {
    console.error(
      "Unhandled API error:",
      error
    );

    res.status(500).json({
      error:
        "Internal server error",
    });
  }
);

const PORT = Number(
  process.env.PORT || 4000
);

async function start() {
  try {
    await connectMongoDB();

    server.listen(
      PORT,
      () => {
        console.log(
          `SafaaiWala backend running on port ${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      "Backend startup failed:",
      error
    );

    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(
    `${signal} received. Shutting down...`
  );

  server.close(async () => {
    try {
      await disconnectMongoDB();
      process.exit(0);
    } catch (error) {
      console.error(
        "Shutdown error:",
        error
      );

      process.exit(1);
    }
  });
}

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);

start();
