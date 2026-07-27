import { Modality } from "@google/genai";
import { validateImageInput } from "./imageValidation.util";
import logger from "../config/logger";
import { getGeminiClient } from "../lib/geminiClient";
import { retryWithBackoff } from "./retry.util";
import { BuildPromptParams } from "../types/eventInviteFormat.type";
import { buildPrompt, getDefaultAspectRatio } from "./promptBuilder.util";

export interface GeminiImageEditOptions {
  imageBuffer: Buffer;
  contentType: string | undefined;
  /** Drives the master prompt template (Section 2) — style, attire, image type */
  promptParams: BuildPromptParams;
  /** Overrides the style's default aspect ratio if provided, e.g. "1:1", "16:9" */
  aspectRatio?: string;
}

export async function editImageWithGemini({
  imageBuffer,
  contentType,
  promptParams,
  aspectRatio,
}: GeminiImageEditOptions): Promise<Buffer> {
  const normalizedContentType = await validateImageInput(
    imageBuffer,
    contentType,
  );

  const fullPrompt = buildPrompt(promptParams);
  const resolvedAspectRatio =
    aspectRatio ?? getDefaultAspectRatio(promptParams.styleId);

  logger.info(
    {
      contentType: normalizedContentType,
      bufferSize: imageBuffer.length,
      styleId: promptParams.styleId,
      imageType: promptParams.imageType,
      aspectRatio: resolvedAspectRatio,
    },
    "Starting Gemini image edit",
  );

  const ai = getGeminiClient();
  const base64Image = imageBuffer.toString("base64");

  const contents = [
    {
      role: "user",
      parts: [
        { text: fullPrompt },
        {
          inlineData: {
            mimeType: normalizedContentType,
            data: base64Image,
          },
        },
      ],
    },
  ];

  const response = await retryWithBackoff(() =>
    ai.models.generateContent({
      model: "gemini-3.1-flash-image",
      contents,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
        imageConfig: { aspectRatio: resolvedAspectRatio },
      },
    }),
  );

  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  let generatedImageBuffer: Buffer | null = null;

  for (const part of parts) {
    if (part.inlineData) {
      generatedImageBuffer = Buffer.from(part.inlineData.data, "base64");
    }
    if (part.text) {
      logger.info(
        { geminiText: part.text },
        "Gemini returned accompanying text",
      );
    }
  }

  if (!generatedImageBuffer) {
    logger.error({ response }, "Gemini response contained no image data");
    throw new Error("Gemini did not return an image in the response");
  }

  logger.info(
    { outputSize: generatedImageBuffer.length, styleId: promptParams.styleId },
    "Gemini image edit succeeded",
  );

  return generatedImageBuffer;
}
