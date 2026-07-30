import { Modality } from "@google/genai";
import { AIEventInviteCard, Event } from "../../generated/prisma/client";
import { getGeminiClient } from "../lib/geminiClient";
import { updateAiEventInviteCard } from "../repositories/aiInviteCard.repository";
import { findWeddingById } from "../repositories/wedding.repository";
import {
  buildGeminiParts,
  buildStage1ExamplePrompt,
  buildStage2TextPrompt,
} from "../utils/aiInviteCardPromptBuilder.util";
import { uploadBufferToS3 } from "./aws.service";

export const aiInviteCardExampleGenerationService = async (
  aiInviteCard: Partial<AIEventInviteCard>,
  event: Event,
) => {
  const stage1Prompt = await buildStage1ExamplePrompt(aiInviteCard);

  const genai = getGeminiClient();

  const parts = await buildGeminiParts(
    aiInviteCard,
    stage1Prompt,
    aiInviteCard.generation_mode === "EXAMPLE",
  );

  const result = await genai.models.generateContent({
    model: "gemini-3.1-flash-image",
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  console.log("Gemini generation completed.");

  // Extract base64 image from the result
  let base64Data: string | undefined;
  let mimeType = "image/png";

  const generatedParts = result.candidates?.[0]?.content?.parts;
  if (generatedParts && generatedParts.length > 0) {
    const imagePart = generatedParts.find(p => p.inlineData);
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
      "ai-invite-cards/invitation-design",
      mimeType
    );

    await updateAiEventInviteCard(aiInviteCard.id, {
      invite_design_image_url: s3Key,
    });

    console.log(`Saved Stage 1 generated design to S3 key: ${s3Key}`);

    // --- STAGE 2: Typesetting ---
    console.log("Starting Stage 2: Typesetting text onto design...");

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

      const stage2Result = await genai.models.generateContent({
        model: "gemini-3-pro-image",
        contents: [{ role: "user", parts: stage2Parts }],
        config: {
          responseModalities: ["TEXT", "IMAGE"],
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
          stage2MimeType
        );

        await updateAiEventInviteCard(aiInviteCard.id, {
          generated_invite_image_url: stage2S3Key,
        });

        console.log(`Saved Stage 2 final invite image to S3 key: ${stage2S3Key}`);
      }
    } else {
      console.warn("Wedding details not found, skipping Stage 2.");
    }
  }

  return result;
};
