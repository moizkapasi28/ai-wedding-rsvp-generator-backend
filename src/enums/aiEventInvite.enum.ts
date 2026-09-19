export enum GENERATION_MODE {
  EXAMPLE = "EXAMPLE",
  MANUAL = "MANUAL",
}

export enum PHOTO_PLACEMENT {
  // Replace the faces of figures already drawn in the reference design
  SWAP_IN_PLACE = "SWAP_IN_PLACE",
  // Add the couple as a framed portrait styled to match the card
  FRAMED_INSET = "FRAMED_INSET",
}

export enum GENERATION_STATUS {
  IDLE = "IDLE",
  QUEUED = "QUEUED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum GENERATION_STAGE {
  DESIGN = "DESIGN",
  TYPESETTING = "TYPESETTING",
}

// A card whose worker has not written a heartbeat within this window is treated as dead,
// so a crashed worker cannot leave it stuck. Healthy runs beat at every stage and retry.
export const GENERATION_STALE_AFTER_MS = 10 * 60 * 1000;

export const GEMINI_IMAGE_MODEL = "gemini-3-pro-image";

// Why a generation failed, stored on the card so the UI can explain it
export enum GENERATION_ERROR_CODE {
  OVERLOADED = "OVERLOADED",
  RATE_LIMITED = "RATE_LIMITED",
  TIMEOUT = "TIMEOUT",
  NO_IMAGE = "NO_IMAGE",
  SAFETY_BLOCKED = "SAFETY_BLOCKED",
  BILLING = "BILLING",
  INVALID_INPUT = "INVALID_INPUT",
  UNKNOWN = "UNKNOWN",
}

// Failures that can succeed on a later job attempt; the rest stop the job immediately
export const RETRYABLE_ERROR_CODES: ReadonlySet<GENERATION_ERROR_CODE> = new Set([
  GENERATION_ERROR_CODE.OVERLOADED,
  GENERATION_ERROR_CODE.RATE_LIMITED,
  GENERATION_ERROR_CODE.TIMEOUT,
  GENERATION_ERROR_CODE.NO_IMAGE,
  GENERATION_ERROR_CODE.UNKNOWN,
]);

export const MAX_GENERATION_ATTEMPTS = 3;

// Wait before job attempt 2, then attempt 3
export const JOB_RETRY_DELAYS_MS = [30_000, 90_000];
