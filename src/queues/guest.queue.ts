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
    removeOnComplete: false, // Keep on complete so the user can fetch the result
    removeOnFail: false,
  });
};
