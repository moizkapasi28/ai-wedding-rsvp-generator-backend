import { Queue } from "bullmq";
import { redisOptions } from "../lib/redis";

export const GUEST_IMPORT_QUEUE_NAME = "guest-import-queue";

export const guestImportQueue = new Queue(GUEST_IMPORT_QUEUE_NAME, {
  connection: redisOptions,
});

export interface ParseGuestListJobPayload {
  type: "parse-excel";
  userId: string;
  weddingId: string;
  filePath: string;
}

export type GuestJobPayload = ParseGuestListJobPayload;

const JOB_RETENTION = { age: 24 * 60 * 60, count: 1000 };

export const addParseGuestListJob = async (
  userId: string,
  weddingId: string,
  filePath: string
) => {
  return guestImportQueue.add("parse-excel", {
    type: "parse-excel",
    userId,
    weddingId,
    filePath,
  }, {
    // Kept for a day so the client can fetch the result (it polls for 5 minutes), then
    // dropped so imports don't pile up in Redis forever
    removeOnComplete: JOB_RETENTION,
    removeOnFail: JOB_RETENTION,
  });
};
