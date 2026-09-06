import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { connection as redisClient } from "../lib/redis";

// Create a scalable rate limiter backed by Redis for auth endpoints (strict)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // Limit each IP to 10 requests per window
  skip: () => process.env.NODE_ENV === "local",
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-expect-error - Known typing issue with rate-limit-redis and ioredis
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: "rl_auth:",
  }),
  message: {
    success: false,
    message: "Too many authentication attempts from this IP, please try again after 15 minutes.",
  },
});

// Create a scalable rate limiter backed by Redis for image generation (strict)
export const imageGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 5, // Limit each IP to 5 requests per window
  skip: () => process.env.NODE_ENV === "local",
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-expect-error - Known typing issue with rate-limit-redis and ioredis
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: "rl_image_gen:",
  }),
  message: {
    success: false,
    message: "Too many image generation requests from this IP. Please try again after 15 minutes.",
  },
});

// Global rate limiter for all other APIs (more permissive)
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 100, // Limit each IP to 100 requests per window
  skip: () => process.env.NODE_ENV === "local",
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-expect-error - Known typing issue with rate-limit-redis and ioredis
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: "rl_global:",
  }),
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});
