import { env } from "../config/env";
import Redis from "ioredis";
import logger from "../config/logger";

export const redisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
};

// Keep a shared connection for general use (if needed elsewhere)
export const connection = new Redis(redisOptions);

connection.on("ready", () => {
  logger.info("✅ Redis connected successfully");
});

connection.on("error", (err) => {
  logger.error(err, "❌ Redis connection error:");
});
