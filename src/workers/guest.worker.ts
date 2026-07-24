import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import { redisOptions } from "../lib/redis";
import { GUEST_IMPORT_QUEUE_NAME, GuestJobPayload } from "../queues/guest.queue";
import { parseGuestListTemplateJob } from "../services/guest.service";
import fs from "fs/promises";
import logger from "../config/logger";
import { ApiError } from "../utils/apiError.util";

export const guestWorker = new Worker<GuestJobPayload>(
  GUEST_IMPORT_QUEUE_NAME,
  async (job) => {
    try {
      if (job.data.type === "parse-excel") {
        const { userId, weddingId, filePath } = job.data;
        logger.info(`Starting excel parse job for wedding ${weddingId}`);
        const result = await parseGuestListTemplateJob(job, userId, weddingId, filePath);
        logger.info(`Completed excel parse for wedding ${weddingId}.`);
        
        // Clean up the temporary file after successfully parsing
        try {
          await fs.unlink(filePath);
        } catch (err) {
          logger.error(`Failed to delete temp file ${filePath}: ${err}`);
        }
        return result;
      }
    } catch (error) {
      logger.error(`Error processing job ${job.id}: ${error}`);
      throw error;
    }
  },
  { 
    connection: redisOptions,
    concurrency: 1 // Process exactly 1 row at a time to prevent DB starvation
  }
);

guestWorker.on("ready", () => {
  logger.info("✅ Guest worker successfully connected to Redis and is ready to process jobs!");
});

guestWorker.on("error", (err) => {
  logger.error(err, "❌ Guest worker encountered an error:");
});
