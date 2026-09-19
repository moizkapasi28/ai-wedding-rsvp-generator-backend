import { GoogleGenAI, Part } from "@google/genai";
import type { Logger } from "pino";
import { AIEventInviteCard, Event } from "../../generated/prisma/client";
import {
  GEMINI_IMAGE_MODEL,
  GENERATION_ERROR_CODE,
  GENERATION_MODE,
  GENERATION_STAGE,
} from "../enums/aiEventInvite.enum";
import { getGeminiClient } from "../lib/geminiClient";
import { updateAiEventInviteCard } from "../repositories/aiInviteCard.repository";
import { findWeddingById } from "../repositories/wedding.repository";
import { computeDesignFingerprint } from "../utils/aiInviteCardGeneration.util";
import {
  buildGeminiParts,
  buildStage1ExamplePrompt,
  buildStage1ManualPrompt,
  buildStage2TextPrompt,
  fetchImageAsGeminiPart,
  getStage1ImageKeys,
} from "../utils/aiInviteCardPromptBuilder.util";
import {
  classifyGeminiError,
  GeminiGenerationError,
  GeneratedImage,
  generateImage,
} from "../utils/geminiImage.util";
import { getBufferFromS3, uploadBufferToS3 } from "./aws.service";

const DESIGN_FOLDER = "ai-invite-cards/generated-images/invitation-design";
const FINAL_FOLDER = "ai-invite-cards/generated-images/final-invitation";

// The pipeline's external calls, injectable so it can run without Gemini or S3
export interface PipelineDeps {
  genai: Pick<GoogleGenAI, "models">;
  uploadImage: (
    buffer: Buffer,
    folder: string,
    mimeType: string,
  ) => Promise<string>;
  loadImage: (key: string) => Promise<{ buffer: Buffer; contentType: string }>;
}

export const defaultPipelineDeps = (): PipelineDeps => ({
  genai: getGeminiClient(),
  uploadImage: uploadBufferToS3,
  loadImage: (key) => getBufferFromS3(key),
});

interface PipelineHooks {
  log: Logger;
  onStage: (stage: GENERATION_STAGE) => Promise<unknown>;
  onRetry: () => Promise<unknown>;
}

const timedStage = async (
  log: Logger,
  stage: GENERATION_STAGE,
  run: () => Promise<GeneratedImage>,
) => {
  const startedAt = Date.now();

  try {
    const image = await run();

    log.info(
      {
        stage,
        duration_ms: Date.now() - startedAt,
        outcome: "ok",
        bytes: image.data.length,
      },
      "generation.stage",
    );

    return image;
  } catch (error) {
    log.warn(
      {
        stage,
        duration_ms: Date.now() - startedAt,
        outcome: "error",
        error_code: classifyGeminiError(error).code,
      },
      "generation.stage",
    );

    throw error;
  }
};

// DESIGN draws text-less artwork, TYPESETTING adds the wedding text to it. The artwork is
// saved with a fingerprint of its stage 1 input, so a retry or a text-only edit skips DESIGN.
export const runInviteCardPipeline = async (
  card: AIEventInviteCard,
  event: Event,
  deps: PipelineDeps,
  hooks: PipelineHooks,
): Promise<{ generatedImageKey: string; designReused: boolean }> => {
  const isExample = card.generation_mode === GENERATION_MODE.EXAMPLE;

  const wedding = await findWeddingById(event.wedding_id);

  if (!wedding)
    throw new GeminiGenerationError(
      GENERATION_ERROR_CODE.INVALID_INPUT,
      `Wedding ${event.wedding_id} not found`,
    );

  const stage1Prompt = isExample
    ? await buildStage1ExamplePrompt(card)
    : await buildStage1ManualPrompt(card);
  const { reference, subject } = getStage1ImageKeys(card, isExample);
  const fingerprint = computeDesignFingerprint({
    model: GEMINI_IMAGE_MODEL,
    prompt: stage1Prompt,
    imageKeys: [reference, subject],
  });
  const designReused =
    !!card.invite_design_image_url && card.design_fingerprint === fingerprint;

  const geminiOptions = {
    onRetry: (failure: GeminiGenerationError, waitMs: number) => {
      hooks.log.warn(
        { error_code: failure.code, wait_ms: waitMs },
        "generation.retry",
      );

      return hooks.onRetry();
    },
  };

  hooks.log.info(
    { mode: card.generation_mode, design_reused: designReused },
    "generation.start",
  );

  let artwork: GeneratedImage;

  if (designReused) {
    const { buffer, contentType } = await deps.loadImage(
      card.invite_design_image_url,
    );

    artwork = { data: buffer, mimeType: contentType };
  } else {
    await hooks.onStage(GENERATION_STAGE.DESIGN);

    artwork = await timedStage(hooks.log, GENERATION_STAGE.DESIGN, async () =>
      generateImage(
        deps.genai,
        await buildGeminiParts(card, stage1Prompt, isExample),
        geminiOptions,
      ),
    );

    const designKey = await deps.uploadImage(
      artwork.data,
      DESIGN_FOLDER,
      artwork.mimeType,
    );

    // Saved together, so a stored fingerprint always describes the stored artwork
    await updateAiEventInviteCard(card.id, {
      invite_design_image_url: designKey,
      design_fingerprint: fingerprint,
    });
  }

  await hooks.onStage(GENERATION_STAGE.TYPESETTING);

  const finalImage = await timedStage(
    hooks.log,
    GENERATION_STAGE.TYPESETTING,
    async () => {
      const parts: Part[] = [
        { text: buildStage2TextPrompt(card, event, wedding, isExample) },
      ];

      if (isExample) {
        if (card.reference_image) {
          parts.push({
            text: "[REFERENCE IMAGE — use for exact typography, font style, and color matching]",
          });
          parts.push(await fetchImageAsGeminiPart(card.reference_image));
        }

        parts.push({
          text: "[BASE DESIGN — apply the text onto this text-less image]",
        });
      }

      parts.push({
        inlineData: {
          mimeType: artwork.mimeType,
          data: artwork.data.toString("base64"),
        },
      });

      return generateImage(deps.genai, parts, geminiOptions);
    },
  );

  const generatedImageKey = await deps.uploadImage(
    finalImage.data,
    FINAL_FOLDER,
    finalImage.mimeType,
  );

  await updateAiEventInviteCard(card.id, {
    generated_invite_image_url: generatedImageKey,
  });

  return { generatedImageKey, designReused };
};
