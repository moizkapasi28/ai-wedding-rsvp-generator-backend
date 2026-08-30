import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { connectDB } from "./lib/prisma";
import { errorHandler } from "./middlewares/error.middleware";
import { requestLogger } from "./middlewares/logger.middleware";
import authRouter from "./routes/auth.routes";
import weddingRouter from "./routes/wedding.routes";
import eventRouter from "./routes/event.routes";

import { apiReference } from "@scalar/express-api-reference";
import openApiDoc from "./openapi.json";
import guestsRouter from "./routes/guests.routes";
import eventInviteFormatRouter from "./routes/eventInviteFormat.route";
import generalRouter from "./routes/general.routes";
import aiInviteCardRouter from "./routes/aiInviteCard.routes";

const app = express();

// Security headers (applied globally before other middlewares)
app.use(helmet());

// Trust proxy if we are behind a reverse proxy (Nginx, Heroku, AWS ELB, etc.)
// This ensures req.ip gets the real client IP instead of the proxy IP
app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.WEB_APP_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(requestLogger);

import { globalLimiter, authLimiter } from "./middlewares/rateLimiter.middleware";

// Health check endpoint (placed before rate limiter for load balancers)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", globalLimiter);

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/wedding", weddingRouter);
app.use("/api/event", eventRouter);
app.use("/api/guest", guestsRouter);
app.use("/api/page-setting", eventInviteFormatRouter);
app.use("/api/ai-invite-card", aiInviteCardRouter);
app.use("/api/general", generalRouter);

// API Documentation
app.use(
  "/reference",
  apiReference({
    theme: "purple",
    spec: {
      content: openApiDoc,
    },
  }),
);

app.use(errorHandler);

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on PORT: ${PORT}`);
  });
}

startServer();
