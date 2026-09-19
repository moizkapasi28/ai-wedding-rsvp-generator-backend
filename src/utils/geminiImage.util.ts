import {
  GenerateContentResponse,
  GoogleGenAI,
  Modality,
  Part,
} from "@google/genai";
import {
  GEMINI_IMAGE_MODEL,
  GENERATION_ERROR_CODE,
  RETRYABLE_ERROR_CODES,
} from "../enums/aiEventInvite.enum";

export type GeneratedImage = { data: Buffer; mimeType: string };

export class GeminiGenerationError extends Error {
  readonly retryable: boolean;

  constructor(
    readonly code: GENERATION_ERROR_CODE,
    message: string,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "GeminiGenerationError";
    this.retryable = RETRYABLE_ERROR_CODES.has(code);
    Object.setPrototypeOf(this, GeminiGenerationError.prototype);
  }
}

// Google's plain rate-limit 429 also mentions "quota" and "billing"; only an empty
// prepaid balance mentions credits.
const BILLING_PATTERN = /credit/i;

const NETWORK_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENOTFOUND",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
]);

const SAFETY_FINISH_REASONS = new Set<string>([
  "SAFETY",
  "IMAGE_SAFETY",
  "PROHIBITED_CONTENT",
  "IMAGE_PROHIBITED_CONTENT",
  "BLOCKLIST",
  "SPII",
]);

export const classifyGeminiError = (error: unknown): GeminiGenerationError => {
  if (error instanceof GeminiGenerationError) return error;

  const err = error as {
    name?: string;
    status?: number;
    code?: string;
    message?: string;
    cause?: { code?: string };
  } | null;
  const message = err?.message ?? String(error);
  const typed = (code: GENERATION_ERROR_CODE) =>
    new GeminiGenerationError(code, message, error);

  if (err?.name === "AbortError" || err?.name === "TimeoutError")
    return typed(GENERATION_ERROR_CODE.TIMEOUT);

  const status = err?.status;

  if (status === 429 || message.includes("RESOURCE_EXHAUSTED"))
    return typed(
      BILLING_PATTERN.test(message)
        ? GENERATION_ERROR_CODE.BILLING
        : GENERATION_ERROR_CODE.RATE_LIMITED,
    );

  if (status === 500 || status === 502 || status === 503 || status === 504)
    return typed(GENERATION_ERROR_CODE.OVERLOADED);

  if (status === 400) return typed(GENERATION_ERROR_CODE.INVALID_INPUT);

  if (
    NETWORK_ERROR_CODES.has(err?.code) ||
    NETWORK_ERROR_CODES.has(err?.cause?.code) ||
    /fetch failed/i.test(message)
  )
    return typed(GENERATION_ERROR_CODE.OVERLOADED);

  return typed(GENERATION_ERROR_CODE.UNKNOWN);
};

export const extractImageOrThrow = (
  response: Pick<GenerateContentResponse, "candidates" | "promptFeedback">,
): GeneratedImage => {
  const blockReason = response.promptFeedback?.blockReason;

  if (blockReason)
    throw new GeminiGenerationError(
      GENERATION_ERROR_CODE.SAFETY_BLOCKED,
      `Prompt blocked: ${blockReason}`,
    );

  const candidate = response.candidates?.[0];
  const finishReason = candidate?.finishReason;

  if (finishReason && SAFETY_FINISH_REASONS.has(finishReason))
    throw new GeminiGenerationError(
      GENERATION_ERROR_CODE.SAFETY_BLOCKED,
      `Image blocked: ${finishReason}`,
    );

  const image = candidate?.content?.parts?.find(
    (part) => part.inlineData?.data,
  )?.inlineData;

  if (!image)
    throw new GeminiGenerationError(
      GENERATION_ERROR_CODE.NO_IMAGE,
      `No image returned (finishReason: ${finishReason ?? "none"})`,
    );

  return {
    data: Buffer.from(image.data, "base64"),
    mimeType: image.mimeType || "image/png",
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateImage = async (
  genai: Pick<GoogleGenAI, "models">,
  parts: Part[],
  {
    timeoutMs = 120_000,
    retryDelaysMs = [2_000, 6_000],
    onRetry,
  }: {
    timeoutMs?: number;
    retryDelaysMs?: number[];
    onRetry?: (failure: GeminiGenerationError, waitMs: number) => unknown;
  } = {},
): Promise<GeneratedImage> => {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await genai.models.generateContent({
        model: GEMINI_IMAGE_MODEL,
        contents: [{ role: "user", parts }],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
          imageConfig: { aspectRatio: "9:16" },
          // Client-side cancel only: Google can still bill a request that completes
          // after we have given up on it.
          abortSignal: AbortSignal.timeout(timeoutMs),
        },
      });

      return extractImageOrThrow(response);
    } catch (error) {
      const failure = classifyGeminiError(error);
      const delay = retryDelaysMs[attempt];

      // Only brief outages are worth waiting for here; the job retries the rest.
      if (failure.code !== GENERATION_ERROR_CODE.OVERLOADED || delay === undefined)
        throw failure;

      const waitMs = Math.round(delay * (0.8 + Math.random() * 0.4));
      await onRetry?.(failure, waitMs);
      await sleep(waitMs);
    }
  }
};
