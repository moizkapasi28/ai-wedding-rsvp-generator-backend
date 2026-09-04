import { Modality } from "@google/genai";
import { AIEventInviteCard, Event } from "../../generated/prisma/client";
import logger from "../config/logger";
import { getGeminiClient } from "../lib/geminiClient";
import { updateAiEventInviteCard } from "../repositories/aiInviteCard.repository";
import { findWeddingById } from "../repositories/wedding.repository";
import {
  buildGeminiParts,
  buildStage1ExamplePrompt,
  buildStage1ManualPrompt,
  buildStage2TextPrompt,
  fetchImageAsGeminiPart,
} from "../utils/aiInviteCardPromptBuilder.util";
import { uploadBufferToS3 } from "./aws.service";
import { generateContentWithRetry } from "../utils/geminiRetry.util";
import { GENERATION_MODE } from "../enums/aiEventInvite.enum";
import { performProgrammaticFaceSwap } from "./faceSwap.service";

export const aiInviteCardExampleGenerationService = async (
  aiInviteCard: Partial<AIEventInviteCard>,
  event: Event,
) => {
  const stage1Prompt = await buildStage1ExamplePrompt(aiInviteCard);

  const genai = getGeminiClient();

  const parts = await buildGeminiParts(
    aiInviteCard,
    stage1Prompt,
    aiInviteCard.generation_mode === GENERATION_MODE.EXAMPLE,
  );

  const result = await generateContentWithRetry(genai, {
    model: "gemini-3-pro-image",
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
      imageConfig: {
        aspectRatio: "9:16",
      },
    },
  });

  logger.info("Gemini generation completed.");

  // Extract base64 image from the result
  let base64Data: string | undefined;
  let mimeType = "image/png";

  const generatedParts = result.candidates?.[0]?.content?.parts;
  if (generatedParts && generatedParts.length > 0) {
    const imagePart = generatedParts.find((p) => p.inlineData);
    if (imagePart?.inlineData) {
      base64Data = imagePart.inlineData.data;
      mimeType = imagePart.inlineData.mimeType || "image/png";
    }
  }

  // Save the generated image to S3 and update the DB
  if (base64Data && aiInviteCard.id) {
    let buffer = Buffer.from(base64Data, "base64");

    // --- STAGE 1.5: Programmatic Face Swap ---
    //!!Function is deprecated for now as its not giving desired results
    if (aiInviteCard.couple_raw_image_key) {
      logger.info("Starting programmatic face swap...");
      try {
        const swappedBuffer = await performProgrammaticFaceSwap({
          targetImageBuffer: buffer,
          sourceFaceS3Key: aiInviteCard.couple_raw_image_key,
        });
        buffer = Buffer.from(swappedBuffer);
        base64Data = buffer.toString("base64");
      } catch (err) {
        logger.error(
          { err },
          "Face swap failed, continuing with un-swapped image.",
        );
      }
    }

    const s3Key = await uploadBufferToS3(
      buffer,
      "ai-invite-cards/generated-images/invitation-design",
      mimeType,
    );

    await updateAiEventInviteCard(aiInviteCard.id, {
      invite_design_image_url: s3Key,
    });

    logger.info({ s3Key }, "Saved Stage 1 generated design to S3");

    // --- STAGE 2: Typesetting ---
    logger.info("Starting Stage 2: Typesetting text onto design...");

    const wedding = await findWeddingById(event.wedding_id);

    if (wedding) {
      const stage2Prompt = buildStage2TextPrompt(aiInviteCard, event, wedding, true);

      const stage2Parts: any[] = [
        { text: stage2Prompt }
      ];

      if (aiInviteCard.reference_image) {
        const referencePart = await fetchImageAsGeminiPart(aiInviteCard.reference_image);
        if (referencePart) {
          stage2Parts.push({ text: "[REFERENCE IMAGE — use for exact typography, font style, and color matching]" });
          stage2Parts.push(referencePart);
        }
      }

      stage2Parts.push({ text: "[BASE DESIGN — apply the text onto this text-less image]" });
      stage2Parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      });

      const stage2Result = await generateContentWithRetry(genai, {
        model: "gemini-3-pro-image",
        contents: [{ role: "user", parts: stage2Parts }],
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: "9:16",
          },
        },
      });

      let stage2Base64Data: string | undefined;
      let stage2MimeType = "image/png";

      const stage2GeneratedParts = stage2Result.candidates?.[0]?.content?.parts;
      if (stage2GeneratedParts && stage2GeneratedParts.length > 0) {
        const stage2ImagePart = stage2GeneratedParts.find((p) => p.inlineData);
        if (stage2ImagePart?.inlineData) {
          stage2Base64Data = stage2ImagePart.inlineData.data;
          stage2MimeType = stage2ImagePart.inlineData.mimeType || "image/png";
        }
      }

      if (stage2Base64Data) {
        const stage2Buffer = Buffer.from(stage2Base64Data, "base64");
        const stage2S3Key = await uploadBufferToS3(
          stage2Buffer,
          "ai-invite-cards/generated-images/final-invitation",
          stage2MimeType,
        );

        await updateAiEventInviteCard(aiInviteCard.id, {
          generated_invite_image_url: stage2S3Key,
        });

        logger.info(
          { stage2S3Key },
          "Saved Stage 2 final invite image to S3",
        );
        return stage2S3Key;
      }
    } else {
      logger.warn("Wedding details not found, skipping Stage 2.");
    }

    return s3Key;
  }

  return null;
};

export const aiInviteCardManualGenerationService = async (
  aiInviteCard: Partial<AIEventInviteCard>,
  event: Event,
) => {
  const stage1Prompt = await buildStage1ManualPrompt(aiInviteCard);

  const genai = getGeminiClient();

  const parts = await buildGeminiParts(
    aiInviteCard,
    stage1Prompt,
    aiInviteCard.generation_mode === GENERATION_MODE.MANUAL,
  );

  const result = await generateContentWithRetry(genai, {
    model: "gemini-3-pro-image",
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
      imageConfig: {
        aspectRatio: "9:16",
      },
    },
  });

  logger.info("Gemini manual generation completed.");

  // Extract base64 image from the result
  let base64Data: string | undefined;
  let mimeType = "image/png";

  const generatedParts = result.candidates?.[0]?.content?.parts;
  if (generatedParts && generatedParts.length > 0) {
    const imagePart = generatedParts.find((p) => p.inlineData);
    if (imagePart?.inlineData) {
      base64Data = imagePart.inlineData.data;
      mimeType = imagePart.inlineData.mimeType || "image/png";
    }
  }

  // Save the generated image to S3 and update the DB
  if (base64Data && aiInviteCard.id) {
    const buffer = Buffer.from(base64Data, "base64");

    const s3Key = await uploadBufferToS3(
      buffer,
      "ai-invite-cards/generated-images/invitation-design",
      mimeType,
    );

    await updateAiEventInviteCard(aiInviteCard.id, {
      invite_design_image_url: s3Key,
    });

    logger.info({ s3Key }, "Saved Stage 1 manual generated design to S3");

    logger.info("Starting Stage 2: Typesetting text onto design...");

    const wedding = await findWeddingById(event.wedding_id);

    if (wedding) {
      const stage2Prompt = buildStage2TextPrompt(aiInviteCard, event, wedding);

      const stage2Parts = [
        { text: stage2Prompt },
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        },
      ];

      const stage2Result = await generateContentWithRetry(genai, {
        model: "gemini-3-pro-image",
        contents: [{ role: "user", parts: stage2Parts }],
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: "9:16",
          },
        },
      });

      let stage2Base64Data: string | undefined;
      let stage2MimeType = "image/png";

      const stage2GeneratedParts = stage2Result.candidates?.[0]?.content?.parts;
      if (stage2GeneratedParts && stage2GeneratedParts.length > 0) {
        const stage2ImagePart = stage2GeneratedParts.find((p) => p.inlineData);
        if (stage2ImagePart?.inlineData) {
          stage2Base64Data = stage2ImagePart.inlineData.data;
          stage2MimeType = stage2ImagePart.inlineData.mimeType || "image/png";
        }
      }

      if (stage2Base64Data) {
        const stage2Buffer = Buffer.from(stage2Base64Data, "base64");
        const stage2S3Key = await uploadBufferToS3(
          stage2Buffer,
          "ai-invite-cards/final-invitation",
          stage2MimeType,
        );

        await updateAiEventInviteCard(aiInviteCard.id, {
          generated_invite_image_url: stage2S3Key,
        });

        logger.info(
          { stage2S3Key },
          "Saved Stage 2 manual final invite image to S3",
        );
        return stage2S3Key;
      }
    } else {
      logger.warn("Wedding details not found, skipping Stage 2.");
    }

    return s3Key;
  }

  return null;
};
