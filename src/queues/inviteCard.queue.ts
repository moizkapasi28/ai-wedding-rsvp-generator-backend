import { Queue } from "bullmq";
import { MAX_GENERATION_ATTEMPTS } from "../enums/inviteCard.enum";
import { redisOptions } from "../lib/redis";

export const INVITE_CARD_QUEUE_NAME = "ai-invite-card-queue";

export const inviteCardQueue = new Queue(INVITE_CARD_QUEUE_NAME, {
  connection: redisOptions,
});

export interface GenerateInviteCardJobPayload {
  type: "generate-invite-card";
  inviteCardId: string;
  eventId: string;
  userId: string;
}

export type InviteCardJobPayload = GenerateInviteCardJobPayload;

export const addGenerateInviteCardJob = async (
  inviteCardId: string,
  eventId: string,
  userId: string,
) => {
  return inviteCardQueue.add(
    "generate-invite-card",
    { type: "generate-invite-card", inviteCardId, eventId, userId },
    {
      // Retryable failures re-run the job, which resumes from the saved artwork; the job
      // throws UnrecoverableError for failures a retry cannot fix (billing, safety, input).
      attempts: MAX_GENERATION_ATTEMPTS,
      backoff: { type: "custom" },
      // Keep finished jobs long enough to debug, then let Redis reclaim them.
      removeOnComplete: { age: 24 * 60 * 60, count: 500 },
      removeOnFail: { age: 24 * 60 * 60, count: 500 },
    },
  );
};
