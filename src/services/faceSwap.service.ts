import { getGeminiClient } from "../lib/geminiClient";
import { getBufferFromS3 } from "./aws.service";
import { Modality } from "@google/genai";

/**
 * Interface for face swap requests
 */
export interface FaceSwapRequest {
  targetImageBuffer: Buffer | Uint8Array; // The AI-generated image (target body/clothes)
  sourceFaceS3Key: string; // The S3 key for the user's raw photo (source face)
}

/**
 * Programmatically swaps the face on the target image with the face from the source image.
 * Uses Google Gemini (gemini-3-pro-image).
 *
 * @param request FaceSwapRequest
 * @returns A Buffer containing the composited image with the swapped face.
 */
export const performProgrammaticFaceSwap = async (
  request: FaceSwapRequest,
): Promise<Buffer> => {
  const genai = getGeminiClient();

  try {
    // 1. Fetch the source photo (face) from S3
    const { buffer: sourceFaceBuffer, contentType } = await getBufferFromS3(
      request.sourceFaceS3Key,
    );

    // 2. Convert buffers to base64
    const targetImageBase64 = Buffer.from(request.targetImageBuffer).toString(
      "base64",
    );
    const sourceFaceBase64 = sourceFaceBuffer.toString("base64");
    const sourceMimeType = contentType || "image/jpeg";

    console.log("Calling Gemini API for Face Swap...");

    // 3. Call Gemini model
    const parts = [
      {
        text:
          "[CRITICAL: MULTI-FACE IDENTITY TRANSFER]\n" +
          "Your task is to swap the faces in the FIRST image (the target design) with the matching faces from the SECOND image (the real couple's photo).\n" +
          "1. DETECT ALL FACES: Identify all figures in the first image and map them to the corresponding people in the second image based on gender, attire (bride/groom), and context.\n" +
          "2. SWAP ALL MATCHING FACES: Replace EVERY corresponding face in the first image with the exact facial identity, eyes, nose, mouth, and skin tone of that specific person from the second image.\n" +
          "3. If there is a bride and a groom in the first image, ensure BOTH the bride's face and the groom's face are correctly swapped with their respective real-world faces from the second image.\n" +
          "4. PRESERVE EVERYTHING ELSE: Keep the body, pose, clothing, hairstyle, background, lighting, and original art style (e.g. illustration or painting) exactly the same as the first image. Do NOT alter anything except the facial features.\n" +
          "5. Blend the new faces naturally into the first image's existing lighting and medium so they do not look pasted on.",
      },
      {
        inlineData: {
          mimeType: "image/png",
          data: targetImageBase64,
        },
      },
      {
        inlineData: {
          mimeType: sourceMimeType,
          data: sourceFaceBase64,
        },
      },
    ];

    const result = await genai.models.generateContent({
      model: "gemini-3-pro-image",
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
        imageConfig: {
          aspectRatio: "9:16",
        },
      },
    });

    const generatedParts = result.candidates?.[0]?.content?.parts;
    if (generatedParts && generatedParts.length > 0) {
      const imagePart = generatedParts.find((p) => p.inlineData);
      if (imagePart?.inlineData) {
        console.log("Gemini Face Swap succeeded.");
        return Buffer.from(imagePart.inlineData.data, "base64");
      }
    }

    throw new Error("Gemini returned empty output or no image data");
  } catch (error) {
    console.error(
      "Error during programmatic face swap. Falling back to un-swapped image.",
      error,
    );
    return Buffer.from(request.targetImageBuffer); // Return original if swap fails
  }
};
