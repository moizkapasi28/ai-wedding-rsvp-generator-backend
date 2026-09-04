import { GoogleGenAI } from "@google/genai";
import logger from "../config/logger";

export class GeminiGenerationError extends Error {
  constructor(
    message: string,
    public type: "TRANSIENT" | "TIMEOUT" | "PERMANENT",
    public originalError?: any
  ) {
    super(message);
    this.name = "GeminiGenerationError";

    // Set prototype explicitly for built-in Error subclassing in TS
    Object.setPrototypeOf(this, GeminiGenerationError.prototype);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateContentWithRetry = async (
  genai: GoogleGenAI,
  params: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  fallbackModel: string = "gemini-3-pro-image",
  timeoutMs: number = 30000
): ReturnType<GoogleGenAI["models"]["generateContent"]> => {
  const maxRetries = 3;
  const baseDelays = [1000, 2000, 4000];
  let attempt = 0;

  const executeGeneration = async () => {
    while (attempt <= maxRetries) {
      try {
        if (attempt > 0) {
          logger.info(`Gemini generation retry attempt ${attempt} of ${maxRetries}`);
        }

        // On the final retry attempt (attempt === maxRetries), use the fallback model
        const currentParams = { ...params };
        if (attempt === maxRetries && fallbackModel) {
          logger.info(`Final attempt: using fallback model ${fallbackModel}`);
          currentParams.model = fallbackModel;
        }

        const result = await genai.models.generateContent(currentParams);
        return result;
      } catch (error: any) {
        attempt++;

        // Extract status code from the error if available
        // Google Gen AI SDK errors usually have `status` or `statusText`
        const status = error?.status || error?.response?.status;
        const statusText = error?.statusText || error?.response?.statusText || error?.message || "";

        logger.warn(
          { attempt: attempt - 1, status, error: statusText },
          "Gemini API call failed"
        );

        // Permanent errors: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found
        if (status === 400 || status === 401 || status === 403 || status === 404) {
          throw new GeminiGenerationError(
            `Permanent error encountered: ${status}`,
            "PERMANENT",
            error
          );
        }

        // Retryable errors: 503 Unavailable, 429 Too Many Requests
        const isRetryable = status === 503 || status === 429 || statusText.includes("UNAVAILABLE") || statusText.includes("Too Many Requests");

        if (isRetryable && attempt <= maxRetries) {
          const baseDelay = baseDelays[attempt - 1] || baseDelays[baseDelays.length - 1];
          // Add jitter: +/- 30% of the base delay to prevent thundering herd
          const jitter = baseDelay * 0.3 * (Math.random() * 2 - 1);
          const delay = Math.floor(baseDelay + jitter);

          await sleep(delay);
          continue; // Try again
        }

        // If not retryable or max retries exceeded, throw a transient error
        throw new GeminiGenerationError(
          `Transient failure after ${attempt} attempts`,
          "TRANSIENT",
          error
        );
      }
    }

    throw new GeminiGenerationError("Unexpected end of retry loop", "TRANSIENT");
  };

  // Wrap the execution in a timeout
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new GeminiGenerationError(`Request timed out after ${timeoutMs}ms`, "TIMEOUT"));
    }, timeoutMs);

    executeGeneration()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};
