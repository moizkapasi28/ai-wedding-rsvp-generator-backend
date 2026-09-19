import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import logger from "../config/logger";
import { JOB_RETRY_DELAYS_MS } from "../enums/aiEventInvite.enum";
import { redisOptions } from "../lib/redis";
import {
  AI_INVITE_CARD_QUEUE_NAME,
  AiInviteCardJobPayload,
} from "../queues/aiInviteCard.queue";
import { runAiInviteCardGenerationJob } from "../services/aiInviteCard.service";

export const aiInviteCardWorker = new Worker<AiInviteCardJobPayload>(
  AI_INVITE_CARD_QUEUE_NAME,
  async (job) => {
    if (job.data.type !== "generate-invite-card") return;

    const { aiInviteCardId } = job.data;

    logger.info(
      { jobId: job.id, aiInviteCardId },
      "Starting AI invite card generation",
    );

    const result = await runAiInviteCardGenerationJob(job.data, {
      // attemptsMade counts finished attempts, so it is 0 on the first run
      attempt: job.attemptsMade + 1,
      maxAttempts: job.opts.attempts ?? 1,
      jobId: job.id,
    });

    logger.info(
      { jobId: job.id, aiInviteCardId },
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

aiInviteCardWorker.on("ready", () => {
  logger.info("✅ AI invite card worker connected to Redis and ready!");
});

aiInviteCardWorker.on("failed", (job, err) => {
  logger.error(
    { err, jobId: job?.id, aiInviteCardId: job?.data?.aiInviteCardId },
    "❌ AI invite card job failed",
  );
});

aiInviteCardWorker.on("error", (err) => {
  logger.error(err, "❌ AI invite card worker encountered an error:");
});
