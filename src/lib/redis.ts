import Redis from "ioredis";
import "dotenv/config";
import logger from "../config/logger";

export const redisOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
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
