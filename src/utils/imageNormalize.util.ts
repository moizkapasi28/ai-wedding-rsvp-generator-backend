import sharp from "sharp";
import { GENERATION_ERROR_CODE } from "../enums/aiEventInvite.enum";
import { GeminiGenerationError, GeneratedImage } from "./geminiImage.util";

export const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;

// Larger sources only add upload time and cost; Gemini gains nothing past this
const MAX_SIDE_PX = 2048;

// Uploads go straight from the browser to S3, so this runs in the worker before an image
// reaches Gemini: upright (EXIF), bounded size, and a truthful mime type.
// ponytail: HEIC is not decodable with sharp's prebuilt libvips, so it fails as INVALID_INPUT.
// iOS Safari converts HEIC to JPEG on file-input upload, so this is rare in practice.
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
