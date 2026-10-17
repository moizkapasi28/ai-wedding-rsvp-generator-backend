import sharp from "sharp";
import { GENERATION_ERROR_CODE } from "../enums/inviteCard.enum";
import { GeminiGenerationError, GeneratedImage } from "./geminiImage.util";

export const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;

// Larger sources only add upload time and cost; Gemini gains nothing past this
const MAX_SIDE_PX = 2048;

// Uploads go straight from the browser to S3, so this runs in the worker before an image
// reaches Gemini: upright (EXIF), bounded size, and a truthful mime type.
// HEIC is rejected, not decoded (BE-020): sharp's prebuilt libheif reads AVIF only (no HEVC), so a
// HEIC source fails here as INVALID_INPUT. The frontend blocks HEIC before upload (lib/imageUpload.ts)
// and iOS Safari converts HEIC to JPEG on file-input upload anyway.
// ponytail: add a pure-JS decoder (e.g. heic-convert) if INVALID_INPUT from HEIC shows up in generation_error_code stats
export const normalizeImageForGemini = async (
  input: Buffer,
): Promise<GeneratedImage> => {
  if (input.length > MAX_SOURCE_IMAGE_BYTES)
    throw new GeminiGenerationError(
      GENERATION_ERROR_CODE.INVALID_INPUT,
      `Source image is ${input.length} bytes, over the 20 MB limit`,
    );

  try {
    const image = sharp(input)
      .rotate()
      .resize(MAX_SIDE_PX, MAX_SIDE_PX, { fit: "inside", withoutEnlargement: true });
    const { hasAlpha } = await image.metadata();

    return hasAlpha
      ? { data: await image.png().toBuffer(), mimeType: "image/png" }
      : { data: await image.jpeg({ quality: 90 }).toBuffer(), mimeType: "image/jpeg" };
  } catch (error) {
    throw new GeminiGenerationError(
      GENERATION_ERROR_CODE.INVALID_INPUT,
      "Source image could not be decoded",
      error,
    );
  }
};
