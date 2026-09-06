import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../../generated/prisma/client";
import logger from "../config/logger";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
});

export async function connectDB() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info("✅ Database connected successfully");
  } catch (error) {
    logger.error(error, "❌ Database connection failed");
    process.exit(1);
  }
}
