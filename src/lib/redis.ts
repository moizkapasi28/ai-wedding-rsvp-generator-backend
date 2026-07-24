import Redis from "ioredis";

export const redisOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
};

// Keep a shared connection for general use (if needed elsewhere)
export const connection = new Redis(redisOptions);
