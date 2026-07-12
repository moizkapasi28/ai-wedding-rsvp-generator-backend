import { Modality } from "@google/genai";
import { validateImageInput } from "./imageValidation.util";
import logger from "../config/logger";
import { getGeminiClient } from "../lib/geminiClient";
import { retryWithBackoff } from "./retry.util";

export interface GeminiImageEditOptions {
  imageBuffer: Buffer;
  contentType: string | undefined;
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string; // e.g. "1:1", "16:9"
}

export async function editImageWithGemini({
  imageBuffer,
  contentType,
  prompt,
  negativePrompt,
  aspectRatio = "1:1",
}: GeminiImageEditOptions): Promise<Buffer> {
  const normalizedContentType = await validateImageInput(
    imageBuffer,
    contentType,
  );

  logger.info(
    { contentType: normalizedContentType, bufferSize: imageBuffer.length },
    "Starting Gemini image edit",
  );

  const ai = getGeminiClient();
  const base64Image = imageBuffer.toString("base64");

  const fullPrompt = `${prompt}. Keep the subject's identity, face, and composition recognizable. Avoid: ${
    negativePrompt || "blurry, low quality"
  }.`;

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
        imageConfig: { aspectRatio },
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
    { outputSize: generatedImageBuffer.length },
    "Gemini image edit succeeded",
  );

  return generatedImageBuffer;
}
