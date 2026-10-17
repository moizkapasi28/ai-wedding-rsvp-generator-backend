import { GoogleGenAI, Part } from "@google/genai";
import type { Logger } from "pino";
import { EventInviteCard, Event } from "../../generated/prisma/client";
import {
  GEMINI_IMAGE_MODEL,
  GENERATION_ERROR_CODE,
  CARD_SOURCE,
  GENERATION_STAGE,
} from "../enums/inviteCard.enum";
import { env } from "../config/env";
import { getGeminiClient } from "../lib/geminiClient";
import {
  addInviteCardVersion,
  updateAiEventInviteCard,
} from "../repositories/inviteCard.repository";
import { findWeddingById } from "../repositories/wedding.repository";
import { computeDesignFingerprint } from "../utils/inviteCardGeneration.util";
import { formatEventDate } from "../utils/eventTextFormat.util";
import {
  ExpectedText,
  typesetWithTextCheck,
} from "../utils/textCheck.util";
import {
  buildGeminiParts,
  buildStage1ExamplePrompt,
  buildStage1ManualPrompt,
  buildStage2TextPrompt,
  fetchImageAsGeminiPart,
  getStage1ImageKeys,
} from "../utils/inviteCardPromptBuilder.util";
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
  // Set when INVITE_CARD_TEXT_CHECK is on: returns the text Gemini reads off the final card
  readText?: (image: GeneratedImage) => Promise<string>;
}

const READ_TEXT_PROMPT =
  "Transcribe every piece of text printed on this invitation card exactly as written, line by line. Output only the text.";

export const defaultPipelineDeps = (): PipelineDeps => {
  const genai = getGeminiClient();
  return {
    genai,
    uploadImage: uploadBufferToS3,
    loadImage: (key) => getBufferFromS3(key),
    readText: env.INVITE_CARD_TEXT_CHECK
      ? async (image) => {
          const response = await genai.models.generateContent({
            model: env.INVITE_CARD_TEXT_CHECK_MODEL,
            contents: [
              {
                role: "user",
                parts: [
                  { text: READ_TEXT_PROMPT },
                  {
                    inlineData: {
                      mimeType: image.mimeType,
                      data: image.data.toString("base64"),
                    },
                  },
                ],
              },
            ],
            config: { abortSignal: AbortSignal.timeout(60_000) },
          });
          return response.text ?? "";
        }
      : undefined,
  };
};

// What the card must say, for the text check: the fields a guest would notice being wrong.
// The date is the same string the TYPESETTING prompt asks for, so its words should all appear.
const expectedCardText = (
  event: Event,
  wedding: { bride_name: string; groom_name: string },
): ExpectedText => [
  { label: "bride name", value: wedding.bride_name },
  { label: "groom name", value: wedding.groom_name },
  { label: "event", value: event.title },
  { label: "date", value: formatEventDate(event.date) },
  { label: "venue", value: event.venue },
];

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
  card: EventInviteCard,
  event: Event,
  deps: PipelineDeps,
  hooks: PipelineHooks,
): Promise<{ generatedImageKey: string; designReused: boolean }> => {
  const isExample = card.card_source === CARD_SOURCE.EXAMPLE;

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
  // The stored artwork, when it was drawn from this exact prompt and these images
  const reusableDesign =
    card.design_fingerprint === fingerprint ? card.invite_design_image_url : null;
  const designReused = !!reusableDesign;

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
    { source: card.card_source, design_reused: designReused },
    "generation.start",
  );

  let artwork: GeneratedImage;

  if (reusableDesign) {
    const { buffer, contentType } = await deps.loadImage(reusableDesign);

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

  const typeset = async () => {
    // Also refreshes the heartbeat before a text-check retry
    await hooks.onStage(GENERATION_STAGE.TYPESETTING);

    return timedStage(hooks.log, GENERATION_STAGE.TYPESETTING, async () => {
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
    });
  };

  let finalImage: GeneratedImage;
  let textCheck: string | null = null;

  if (deps.readText) {
    const checked = await typesetWithTextCheck({
      typeset,
      readText: deps.readText,
      expected: expectedCardText(event, wedding),
    });
    finalImage = checked.image;
    textCheck = checked.textCheck;
    hooks.log.info(
      { text_check: textCheck, missing: checked.missing },
      "generation.text_check",
    );
  } else {
    finalImage = await typeset();
  }

  const generatedImageKey = await deps.uploadImage(
    finalImage.data,
    FINAL_FOLDER,
    finalImage.mimeType,
  );

  await updateAiEventInviteCard(card.id, {
    generated_invite_image_url: generatedImageKey,
    text_check: textCheck,
  });
  await addInviteCardVersion(card.id, generatedImageKey, fingerprint);

  return { generatedImageKey, designReused };
};
