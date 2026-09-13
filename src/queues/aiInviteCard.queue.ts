import { Queue } from "bullmq";
import { redisOptions } from "../lib/redis";

export const AI_INVITE_CARD_QUEUE_NAME = "ai-invite-card-queue";

export const aiInviteCardQueue = new Queue(AI_INVITE_CARD_QUEUE_NAME, {
  connection: redisOptions,
});

export interface GenerateInviteCardJobPayload {
  type: "generate-invite-card";
  aiInviteCardId: string;
  eventId: string;
  userId: string;
}

export type AiInviteCardJobPayload = GenerateInviteCardJobPayload;

export const addGenerateInviteCardJob = async (
  aiInviteCardId: string,
  eventId: string,
  userId: string,
) => {
  return aiInviteCardQueue.add(
    "generate-invite-card",
    { type: "generate-invite-card", aiInviteCardId, eventId, userId },
    {
      // The Gemini calls already retry internally, so a whole re-run would only
      // burn quota on a request that has little chance of succeeding.
      attempts: 1,
      // Keep finished jobs long enough to debug, then let Redis reclaim them.
      removeOnComplete: { age: 24 * 60 * 60, count: 500 },
      removeOnFail: { age: 24 * 60 * 60, count: 500 },
    },
  );
};
