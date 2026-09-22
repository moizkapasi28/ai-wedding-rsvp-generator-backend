import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import logger from "../config/logger";
import { JOB_RETRY_DELAYS_MS } from "../enums/inviteCard.enum";
import { redisOptions } from "../lib/redis";
import {
  INVITE_CARD_QUEUE_NAME,
  InviteCardJobPayload,
} from "../queues/inviteCard.queue";
import { runInviteCardGenerationJob } from "../services/inviteCard.service";

export const inviteCardWorker = new Worker<InviteCardJobPayload>(
  INVITE_CARD_QUEUE_NAME,
  async (job) => {
    if (job.data.type !== "generate-invite-card") return;

    const { inviteCardId } = job.data;

    logger.info(
      { jobId: job.id, inviteCardId },
      "Starting AI invite card generation",
    );

    const result = await runInviteCardGenerationJob(job.data, {
      // attemptsMade counts finished attempts, so it is 0 on the first run
      attempt: job.attemptsMade + 1,
      maxAttempts: job.opts.attempts ?? 1,
      jobId: job.id,
    });

    logger.info(
      { jobId: job.id, inviteCardId },
      "Completed AI invite card generation",
    );

    return result;
  },
  {
    connection: redisOptions,
    // Each job makes two image-model calls, so keep the fan-out narrow.
    concurrency: 1,
    settings: {
      // BullMQ passes 1 once the first attempt has failed
      backoffStrategy: (attemptsMade: number) =>
        JOB_RETRY_DELAYS_MS[Math.min(attemptsMade, JOB_RETRY_DELAYS_MS.length) - 1],
    },
  },
);

inviteCardWorker.on("ready", () => {
  logger.info("✅ AI invite card worker connected to Redis and ready!");
});

inviteCardWorker.on("failed", (job, err) => {
  logger.error(
    { err, jobId: job?.id, inviteCardId: job?.data?.inviteCardId },
    "❌ AI invite card job failed",
  );
});

inviteCardWorker.on("error", (err) => {
  logger.error(err, "❌ AI invite card worker encountered an error:");
});
