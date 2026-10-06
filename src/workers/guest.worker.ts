import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import fs from "fs/promises";
import logger from "../config/logger";
import { redisOptions } from "../lib/redis";
import { GUEST_IMPORT_QUEUE_NAME, GuestJobPayload } from "../queues/guest.queue";
import { parseGuestListTemplateJob } from "../services/guest.service";

export const guestWorker = new Worker<GuestJobPayload>(
  GUEST_IMPORT_QUEUE_NAME,
  async (job) => {
    try {
      if (job.data.type === "parse-excel") {
        const { userId, weddingId, filePath } = job.data;
        logger.info(`Starting excel parse job for wedding ${weddingId}`);
        const result = await parseGuestListTemplateJob(job, userId, weddingId, filePath);
        logger.info(`Completed excel parse for wedding ${weddingId}.`);
        return result;
      }
    } catch (error) {
      logger.error(`Error processing job ${job.id}: ${error}`);
      throw error;
    } finally {
      // The upload is a temp file; remove it whether the import worked or not
      try {
        await fs.unlink(job.data.filePath);
      } catch (err) {
        logger.error(`Failed to delete temp file ${job.data.filePath}: ${err}`);
      }
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
