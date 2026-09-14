import dotenv from "dotenv";
dotenv.config();

// Must run before anything reads process.env
import "../config/env";

import logger from "../config/logger";
import { aiInviteCardWorker } from "./aiInviteCard.worker";
import { guestWorker } from "./guest.worker";

// Single entry point for every background queue, so one process covers them all.
const workers = [guestWorker, aiInviteCardWorker];

logger.info(
  { queues: workers.map((worker) => worker.name) },
  "🚀 Worker process started",
);

let shuttingDown = false;

const shutdown = async (signal: NodeJS.Signals) => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, "Shutting down workers...");

  try {
    // close() waits for the job in flight to finish, so a half-generated
    // invitation is not left behind for the stale sweep to fail.
    await Promise.all(workers.map((worker) => worker.close()));
    logger.info("Workers shut down cleanly");
    process.exit(0);
  } catch (error) {
    logger.error(error, "Failed to shut workers down cleanly");
    process.exit(1);
  }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
