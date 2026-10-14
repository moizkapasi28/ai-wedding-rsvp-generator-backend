import "dotenv/config";
// Must run before anything reads process.env
import "./config/env";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { connectDB, prisma } from "./lib/prisma";
import { connection as redisConnection } from "./lib/redis";
import { errorHandler } from "./middlewares/error.middleware";
import { requestLogger } from "./middlewares/logger.middleware";
import logger from "./config/logger";
import authRouter from "./routes/auth.routes";
import weddingRouter from "./routes/wedding.routes";
import eventRouter from "./routes/event.routes";

import { apiReference } from "@scalar/express-api-reference";
import openApiDoc from "./openapi.json";
import guestsRouter from "./routes/guests.routes";
import eventInviteFormatRouter from "./routes/eventInviteFormat.route";
import generalRouter from "./routes/general.routes";
import inviteCardRouter from "./routes/inviteCard.routes";
import rsvpRouter from "./routes/rsvp.routes";

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
    // Lets the frontend read how long a rate limiter (429) asked it to wait
    exposedHeaders: ["Retry-After"],
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(requestLogger);

import { globalLimiter } from "./middlewares/rateLimiter.middleware";

// Fails with a reason after `ms`. Without it a check could hang: with Redis down, the shared
// connection (maxRetriesPerRequest: null, which BullMQ needs) queues a PING until it is back.
const within = <T>(check: Promise<T>, ms = 2000) =>
  Promise.race([
    check,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timed out")), ms).unref(),
    ),
  ]);

// Health check (before the rate limiter, for load balancers): 503 naming whichever
// dependency is down, since queues, rate limits and live RSVPs all need Redis too
app.get("/health", async (req, res) => {
  const [database, redis] = await Promise.allSettled([
    within(prisma.$queryRaw`SELECT 1`),
    within(redisConnection.ping()),
  ]);
  const checks = {
    database: database.status === "fulfilled" ? "ok" : "down",
    redis: redis.status === "fulfilled" ? "ok" : "down",
  };
  const healthy = Object.values(checks).every((state) => state === "ok");

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "unavailable",
    checks,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", globalLimiter);

app.use("/api/auth", authRouter);
app.use("/api/wedding", weddingRouter);
app.use("/api/event", eventRouter);
app.use("/api/guest", guestsRouter);
app.use("/api/page-setting", eventInviteFormatRouter);
app.use("/api/invite-card", inviteCardRouter);
app.use("/api/general", generalRouter);
app.use("/api/rsvp", rsvpRouter);

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
    logger.info(`🚀 Server running on PORT: ${PORT}`);
  });
}

startServer();
