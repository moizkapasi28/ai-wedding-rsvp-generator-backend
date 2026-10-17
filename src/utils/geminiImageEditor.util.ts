import { GoogleGenAI } from "@google/genai";
import logger from "../config/logger";
import { GENERATION_ERROR_CODE } from "../enums/inviteCard.enum";
import { getGeminiClient } from "../lib/geminiClient";
import { BuildPromptParams } from "../types/eventInviteFormat.type";
import { ApiError } from "./apiError.util";
import {
  GeminiGenerationError,
  GeneratedImage,
  generateImage,
} from "./geminiImage.util";
import { normalizeImageForGemini } from "./imageNormalize.util";
import { buildPrompt, getDefaultAspectRatio } from "./promptBuilder.util";

export const HEADER_IMAGE_MODEL = "gemini-3.1-flash-image";

export interface GeminiImageEditOptions {
  imageBuffer: Buffer;
  /** Drives the master prompt template (Section 2) — style, attire, image type */
  promptParams: BuildPromptParams;
  /** Overrides the style's default aspect ratio if provided, e.g. "1:1", "16:9" */
  aspectRatio?: string;
  genai?: Pick<GoogleGenAI, "models">;
}

// The RSVP page header runs inside the request, so failures become the response.
// Shares generateImage with invite cards: 120s per call, in-call retries for OVERLOADED only.
export async function pageSettingEditImageWithGemini({
  imageBuffer,
  promptParams,
  aspectRatio,
  genai = getGeminiClient(),
}: GeminiImageEditOptions): Promise<GeneratedImage> {
  // Upright (EXIF), at most 2048px, and a mime type that matches the bytes
  const source = await normalizeImageForGemini(imageBuffer);
  const resolvedAspectRatio =
    aspectRatio ?? getDefaultAspectRatio(promptParams.styleId);

  logger.info(
    {
      bufferSize: source.data.length,
      styleId: promptParams.styleId,
      imageType: promptParams.imageType,
      aspectRatio: resolvedAspectRatio,
    },
    "Starting Gemini image edit",
  );

  const image = await generateImage(
    genai,
    [
      { text: buildPrompt(promptParams) },
      {
        inlineData: {
          mimeType: source.mimeType,
          data: source.data.toString("base64"),
        },
      },
    ],
    { model: HEADER_IMAGE_MODEL, aspectRatio: resolvedAspectRatio },
  );

  logger.info(
    { outputSize: image.data.length, styleId: promptParams.styleId },
    "Gemini image edit succeeded",
  );

  return image;
}

const HEADER_IMAGE_ERRORS: Record<
  GENERATION_ERROR_CODE,
  [status: number, message: string]
> = {
  SAFETY_BLOCKED: [422, "The image service declined this photo. Try a different photo or style."],
  INVALID_INPUT: [422, "This photo couldn't be read. Upload a JPEG, PNG or WebP under 20 MB."],
  BILLING: [503, "Image generation is unavailable right now. Please try again later."],
  RATE_LIMITED: [503, "The image service is busy. Please try again in a minute."],
  OVERLOADED: [503, "The image service is busy. Please try again in a minute."],
  TIMEOUT: [504, "Image generation took too long. Please try again."],
  NO_IMAGE: [502, "No image came back from the image service. Please try again."],
  UNKNOWN: [502, "Image generation failed. Please try again."],
};

// A Gemini failure as the response the user sees; anything else (e.g. S3) passes through
export const toHeaderImageError = (error: unknown) => {
  if (!(error instanceof GeminiGenerationError)) return error;
  const [status, message] = HEADER_IMAGE_ERRORS[error.code];
  return new ApiError(status, message);
};
