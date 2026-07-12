import logger from "../config/logger";

export const retryWithBackoff = async function <T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delayMs?: number;
    retryableStatuses?: number[];
  } = {},
): Promise<T> {
  const {
    retries = 3,
    delayMs = 2000,
    retryableStatuses = [500, 503],
  } = options;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRetryable = retryableStatuses.includes(err?.status);
      const isLastAttempt = attempt === retries;

      if (!isRetryable || isLastAttempt) {
        throw err;
      }

      logger.warn(
        { attempt, retries, status: err?.status, delayMs: currentDelay },
        "Request failed, retrying with backoff",
      );
      await new Promise((res) => setTimeout(res, currentDelay));
      currentDelay *= 2;
    }
  }

  throw new Error("Retry loop exited unexpectedly");
};
