import { AIEventInviteCard, Event, Wedding } from "../../generated/prisma/client";
import { getBufferFromS3 } from "../services/aws.service";
import { getAttire, NEUTRAL_DEFAULT_ATTIRE_PROMPT } from "./attireCatelogue.util";
import {
  buildIdentityBlock,
  sanitizeCustomNote,
  COUPLE_FACE_FUSION_CLAUSE,
  GLOBAL_POSITIVE_SUFFIX,
  SUBJECT_DESCRIPTORS,
  SCOPE_BLOCK,
} from "./promptBuilder.util";

async function fetchImageAsGeminiPart(
  s3Key: string | null | undefined,
  mimeType: string = "image/jpeg",
): Promise<{ inlineData: { mimeType: string; data: string } } | null> {
  if (!s3Key) return null;

  const { buffer } = await getBufferFromS3(s3Key);
  return {
    inlineData: {
      mimeType,
      data: buffer.toString("base64"),
    },
  };
}

export async function buildGeminiParts(
  record: Partial<AIEventInviteCard>,
  stage1Prompt: string,
  isExample: boolean,
): Promise<any[]> {
  const parts: any[] = [{ text: stage1Prompt }];

  if (isExample && record.reference_image) {
    const referencePart = await fetchImageAsGeminiPart(record.reference_image);
    if (referencePart) parts.push(referencePart);
  }

  const hasSubjectPhoto = !!record.photo_type && !!record.couple_raw_image_key;
  if (hasSubjectPhoto) {
    const subjectPart = await fetchImageAsGeminiPart(
      record.couple_raw_image_key,
    );
    if (subjectPart) parts.push(subjectPart);
  }

  return parts;
}

function buildCouplePhotoBlock(record: AIEventInviteCard): string {
  const photoType = record.photo_type; // "couple" | "bride" | "groom" | null

  if (!photoType) {
    return "";
  }

  const subjectDescriptor =
    photoType === "couple"
      ? "the bride and groom"
      : photoType === "bride"
        ? "the bride"
        : "the groom";

  const includeBrideAttire = photoType === "couple" || photoType === "bride";
  const includeGroomAttire = photoType === "couple" || photoType === "groom";

  let wardrobeInstruction = "";
  if (includeBrideAttire) {
    const brideBody = record.bride_attire_style
      ? getAttire(record.bride_attire_style)?.promptBody
      : null;
    wardrobeInstruction += `Bride: ${brideBody || NEUTRAL_DEFAULT_ATTIRE_PROMPT}\n`;
  }
  if (includeGroomAttire) {
    const groomBody = record.groom_attire_style
      ? getAttire(record.groom_attire_style)?.promptBody
      : null;
    wardrobeInstruction += `Groom: ${groomBody || NEUTRAL_DEFAULT_ATTIRE_PROMPT}\n`;
  }

  const identityBlockImageType = photoType as Parameters<typeof buildIdentityBlock>[0];

  let extraHandling = "";
  if (photoType === "couple") {
    extraHandling = `\nCOUPLE HANDLING:\n${COUPLE_FACE_FUSION_CLAUSE}\n`;
  } else {
    const subject = SUBJECT_DESCRIPTORS[photoType as keyof typeof SUBJECT_DESCRIPTORS];
    extraHandling = `\nSINGLE SUBJECT HANDLING:\nGenerate ONLY ${subject} in the image. Do not add a partner or any other people to the scene.\n`;
  }

  return `
Incorporate a portrait of ${subjectDescriptor} into the design as a featured framed
photo element (e.g. an oval or arch-framed inset), styled consistently with the card's
overall aesthetic.
${buildIdentityBlock(identityBlockImageType)}

${SCOPE_BLOCK}

WARDROBE & SETTING:
${wardrobeInstruction}
${extraHandling}
QUALITY & SAFETY:
${GLOBAL_POSITIVE_SUFFIX}
  `.trim();
}

export async function buildStage1ExamplePrompt(
  record: Partial<AIEventInviteCard>,
): Promise<string> {
  const additionalDetails = record.additional_details
    ? sanitizeCustomNote(record.additional_details)
    : "";

  const couplePhotoBlock = buildCouplePhotoBlock(record as AIEventInviteCard);
  const couplePhotoSection = couplePhotoBlock
    ? `\nCOUPLE PHOTO (only if photoType is provided):\n${couplePhotoBlock}\n`
    : "";

  return `
REFERENCE-STYLE REPLICATION:
Using the attached reference invitation image as a style guide, create a new invitation
design that closely follows its visual style — color palette, ornamental motifs, border
treatment, layout structure, and overall aesthetic mood. Do not copy any text, names,
dates, or addresses visible in the reference image — replicate the DESIGN LANGUAGE only,
not its content.
${additionalDetails}

LAYOUT:
Preserve the reference image's approach to text placement and negative space, so the
same regions read as intended locations for names, date, time, and venue text — a
subsequent step will typeset the real event data into this layout. Do not render any
text from the reference or invent new text in this pass.
${couplePhotoSection}
COMPOSITION:
Match the reference image's orientation and aspect ratio.
  `.trim();
}

export function buildStage2TextPrompt(
  record: Partial<AIEventInviteCard>,
  event: Event,
  wedding: Wedding
): string {
  const bride = wedding.bride_name;
  const groom = wedding.groom_name;

  // Format the date if it's available
  const dateStr = event.date instanceof Date ? event.date.toDateString() : String(event.date);

  const customMessage = record.custom_message
    ? `\nCustom Message: "${record.custom_message}"`
    : "";

  return `
[CRITICAL INSTRUCTION - EXACT TEXT RENDERING]
You are a master typographer. I have provided a base invitation design image.
You must typeset the exact event details onto this design.
It is IMPERATIVE that the text you generate matches the provided details EXACTLY character-by-character.
Do NOT hallucinate, change, or invent any names, dates, or words. Do NOT add any extra information.

EXACT TEXT TO RENDER:
Event: "${event.title}"
Names: "${bride} & ${groom}"
Date: "${dateStr}"
Time: "${event.time}"
Location: "${event.venue}, ${event.city}"
Address: "${event.address}"${customMessage}

TYPOGRAPHY & COMPOSITION INSTRUCTIONS:
1. Place this exact text in the designated negative spaces of the provided artwork.
2. Use an elegant, highly legible font (e.g. serif, modern script) that perfectly matches the mood of the design.
3. Ensure the names "${bride} & ${groom}" are the most prominent text.
4. Ensure the text color contrasts well with the background.
5. Do NOT alter the underlying artwork or illustrations.
  `.trim();
}
