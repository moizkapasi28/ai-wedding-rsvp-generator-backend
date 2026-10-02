import { type Request } from "express";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { connection as redisClient } from "../lib/redis";

// Strict limiter for the credential and email-sending auth routes only (applied per route in
// auth.routes.ts). Not on access-token/me/logout: the frontend calls those on every page load.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // Limit each IP to 10 requests per window, shared across those routes
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

// The dashboard's SSE stream (GET /api/wedding/:id/live) is one long-lived request that
// reconnects by itself, so it isn't counted. Paths here are relative to the /api mount.
const isLiveStream = (req: Request) =>
  req.method === "GET" && /^\/wedding\/[^/]+\/live$/.test(req.path);

// Global rate limiter for all other APIs (more permissive). Sized so one household IP can keep
// the invite card page polling (every 3s for minutes) with the dashboard open in another tab;
// the expensive routes have their own strict limiters above and below.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 1000, // Limit each IP to 1000 requests per window
  skip: (req) => process.env.NODE_ENV === "local" || isLiveStream(req),
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

// Rate limiter for public RSVP submissions (no login, so keyed by IP)
export const rsvpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 30, // Limit each IP to 30 RSVP submissions per window
  skip: () => process.env.NODE_ENV === "local",
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-expect-error - Known typing issue with rate-limit-redis and ioredis
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: "rl_rsvp:",
  }),
  message: {
    success: false,
    message: "Too many RSVP submissions from this IP, please try again after 15 minutes.",
  },
});
