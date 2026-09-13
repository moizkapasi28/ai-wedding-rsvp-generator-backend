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

// A job that has not reported back within this window is treated as dead,
// so a worker that crashed mid-run cannot leave a card stuck in PROCESSING.
export const GENERATION_STALE_AFTER_MS = 10 * 60 * 1000;
