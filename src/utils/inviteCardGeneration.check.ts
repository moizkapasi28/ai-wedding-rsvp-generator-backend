// Self-check for the pure parts of AI invite card generation (no Gemini, S3 or DB).
// Run from the backend root: npx tsx src/utils/inviteCardGeneration.check.ts
import assert from "node:assert/strict";
import sharp from "sharp";
import { EventInviteCard } from "../../generated/prisma/client";
import {
  GEMINI_IMAGE_MODEL,
  GENERATION_ERROR_CODE,
  GENERATION_ERROR_CODE as CODE,
} from "../enums/inviteCard.enum";
import { computeDesignFingerprint } from "./inviteCardGeneration.util";
import {
  buildStage1ExamplePrompt,
  buildStage1ManualPrompt,
  getStage1ImageKeys,
} from "./inviteCardPromptBuilder.util";
import {
  classifyGeminiError,
  extractImageOrThrow,
  GeminiGenerationError,
} from "./geminiImage.util";
import { normalizeImageForGemini } from "./imageNormalize.util";

const httpError = (status: number, message: string) =>
  Object.assign(new Error(message), { status });

const checkClassifier = () => {
  const code = (error: unknown) => classifyGeminiError(error).code;

  assert.equal(code(httpError(503, "The model is overloaded. UNAVAILABLE")), CODE.OVERLOADED);
  assert.equal(code(httpError(500, "Internal error")), CODE.OVERLOADED);
  assert.equal(
    code(
      httpError(
        429,
        "Your prepayment credits are depleted. Please go to AI Studio to manage your project and billing.",
      ),
    ),
    CODE.BILLING,
  );
  assert.equal(
    code(httpError(429, "You exceeded your current quota, please check your plan and billing details.")),
    CODE.RATE_LIMITED,
  );
  assert.equal(
    code(Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" })),
    CODE.TIMEOUT,
  );
  assert.equal(
    code(Object.assign(new Error("This operation was aborted"), { name: "AbortError" })),
    CODE.TIMEOUT,
  );
  assert.equal(code(httpError(400, "Unable to process input image")), CODE.INVALID_INPUT);
  assert.equal(code(new TypeError("fetch failed")), CODE.OVERLOADED);
  assert.equal(code(new Error("boom")), CODE.UNKNOWN);

  const alreadyTyped = new GeminiGenerationError(CODE.SAFETY_BLOCKED, "blocked");
  assert.equal(classifyGeminiError(alreadyTyped), alreadyTyped);

  const retryable = (errorCode: GENERATION_ERROR_CODE) =>
    new GeminiGenerationError(errorCode, "x").retryable;

  for (const errorCode of [CODE.OVERLOADED, CODE.RATE_LIMITED, CODE.TIMEOUT, CODE.NO_IMAGE, CODE.UNKNOWN])
    assert.equal(retryable(errorCode), true, `${errorCode} should be retryable`);

  for (const errorCode of [CODE.SAFETY_BLOCKED, CODE.BILLING, CODE.INVALID_INPUT])
    assert.equal(retryable(errorCode), false, `${errorCode} should not be retryable`);
};

const checkResponses = () => {
  const response = (value: unknown) => value as Parameters<typeof extractImageOrThrow>[0];
  const codeOf = (value: unknown) => {
    try {
      extractImageOrThrow(response(value));
      return "no error";
    } catch (error) {
      return (error as GeminiGenerationError).code;
    }
  };

  const image = extractImageOrThrow(
    response({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [{ text: "Here it is" }, { inlineData: { mimeType: "image/png", data: "aGk=" } }],
          },
        },
      ],
    }),
  );
  assert.equal(image.mimeType, "image/png");
  assert.equal(image.data.toString(), "hi");

  assert.equal(codeOf({ candidates: [{ finishReason: "IMAGE_SAFETY" }] }), CODE.SAFETY_BLOCKED);
  assert.equal(codeOf({ candidates: [{ finishReason: "IMAGE_PROHIBITED_CONTENT" }] }), CODE.SAFETY_BLOCKED);
  assert.equal(
    codeOf({ promptFeedback: { blockReason: "PROHIBITED_CONTENT" }, candidates: [] }),
    CODE.SAFETY_BLOCKED,
  );
  assert.equal(codeOf({ candidates: [{ finishReason: "NO_IMAGE" }] }), CODE.NO_IMAGE);
  assert.equal(
    codeOf({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "I can't draw that" }] } }] }),
    CODE.NO_IMAGE,
  );
  assert.equal(codeOf({}), CODE.NO_IMAGE);
};

const checkNormalize = async () => {
  const wide = await sharp({
    create: { width: 4000, height: 1000, channels: 3, background: "#cc3333" },
  })
    .jpeg()
    .toBuffer();
  const shrunk = await normalizeImageForGemini(wide);
  assert.equal(shrunk.mimeType, "image/jpeg");
  assert.equal((await sharp(shrunk.data).metadata()).width, 2048);

  const small = await sharp({
    create: { width: 300, height: 200, channels: 3, background: "#000000" },
  })
    .png()
    .toBuffer();
  assert.equal((await sharp((await normalizeImageForGemini(small)).data).metadata()).width, 300);

  const transparent = await sharp({
    create: { width: 10, height: 10, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .png()
    .toBuffer();
  assert.equal((await normalizeImageForGemini(transparent)).mimeType, "image/png");

  // EXIF orientation 6 means "rotate 90° to display": a 40x20 source must come out 20x40
  const sideways = await sharp({
    create: { width: 40, height: 20, channels: 3, background: "#000000" },
  })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();
  const upright = await sharp((await normalizeImageForGemini(sideways)).data).metadata();
  assert.deepEqual([upright.width, upright.height], [20, 40]);

  await assert.rejects(
    normalizeImageForGemini(Buffer.from("definitely not an image")),
    (error: GeminiGenerationError) => error.code === CODE.INVALID_INPUT,
  );
  await assert.rejects(
    normalizeImageForGemini(Buffer.alloc(20 * 1024 * 1024 + 1)),
    (error: GeminiGenerationError) => error.code === CODE.INVALID_INPUT,
  );
};

const checkFingerprint = async () => {
  type Card = Partial<EventInviteCard>;

  const fingerprintOf = async (card: Card) => {
    const isExample = card.card_source === "EXAMPLE";
    const prompt = isExample
      ? await buildStage1ExamplePrompt(card)
      : await buildStage1ManualPrompt(card);
    const { reference, subject } = getStage1ImageKeys(card, isExample);

    return computeDesignFingerprint({
      model: GEMINI_IMAGE_MODEL,
      prompt,
      imageKeys: [reference, subject],
    });
  };

  const manual: Card = {
    card_source: "PRESETS",
    additional_details: "Marigold garlands framing the edges",
    custom_message: "Join us as we begin forever",
    photo_type: "couple",
    couple_raw_image_key: "users/u1/couple-a.jpg",
  };
  const base = await fingerprintOf(manual);

  assert.equal(base, await fingerprintOf({ ...manual }), "fingerprint must be deterministic");
  assert.equal(
    base,
    await fingerprintOf({ ...manual, custom_message: "A different message" }),
    "text-only changes must reuse the artwork",
  );
  assert.notEqual(
    base,
    await fingerprintOf({ ...manual, additional_details: "Lotus ponds at dusk" }),
    "design detail changes must redraw",
  );
  assert.notEqual(
    base,
    await fingerprintOf({ ...manual, couple_raw_image_key: "users/u1/couple-b.jpg" }),
    "a new couple photo must redraw",
  );
  // Describe mode ignores a reference image left over from the other tab
  assert.equal(base, await fingerprintOf({ ...manual, reference_image: "users/u1/ref.jpg" }));

  const example: Card = {
    ...manual,
    card_source: "EXAMPLE",
    reference_image: "users/u1/ref-a.jpg",
    photo_placement: "FRAMED_INSET",
  };
  assert.notEqual(
    await fingerprintOf(example),
    await fingerprintOf({ ...example, reference_image: "users/u1/ref-b.jpg" }),
    "a new reference image must redraw",
  );
};

const main = async () => {
  checkClassifier();
  checkResponses();
  await checkNormalize();
  await checkFingerprint();
};

main().then(
  () => {
    console.log("inviteCardGeneration checks passed");
    process.exit(0);
  },
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
