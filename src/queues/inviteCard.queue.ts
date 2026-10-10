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

// A queue of its own for the stale-generation sweep: on the generation queue it would sit
// behind a run that can take minutes, and it shares none of that queue's retry rules.
export const INVITE_CARD_SWEEP_QUEUE_NAME = "ai-invite-card-sweep-queue";

export const inviteCardSweepQueue = new Queue(INVITE_CARD_SWEEP_QUEUE_NAME, {
  connection: redisOptions,
});

const SWEEP_EVERY_MS = 2 * 60 * 1000;

// Called when the worker process starts. Upserting keeps one schedule however many times
// the worker restarts or however many worker processes run.
export const scheduleInviteCardSweep = () =>
  inviteCardSweepQueue.upsertJobScheduler(
    "retire-stale-generations",
    { every: SWEEP_EVERY_MS },
    {
      name: "retire-stale-generations",
      // The next run is two minutes away anyway, so a failed sweep is not retried
      opts: {
        attempts: 1,
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 50 },
      },
    },
  );

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
