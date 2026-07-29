import {
  AttireConfig,
  BuildPromptParams,
  ImageType,
  StyleConfig,
} from "../types/eventInviteFormat.type";
import { getAttire } from "./attireCatelogue.util";
import { getStyle } from "./styleCatelogue.util";

export const SUBJECT_DESCRIPTORS: Record<ImageType, string> = {
  couple: "the bride and groom",
  bride: "the bride",
  groom: "the groom",
};

const THEME_DESCRIPTIONS: Record<string, string> = {
  "Traditional Indian":
    "A traditional Indian wedding theme, featuring rich, vibrant colors like deep reds, golds, and marigolds, ornate floral decorations, traditional motifs, and a culturally festive, grand atmosphere.",
  "Modern Minimalist":
    "A modern minimalist wedding theme, emphasizing clean lines, elegant simplicity, neutral and soft color palettes, uncluttered spaces, and sophisticated, understated decor.",
  Watercolor:
    "A watercolor wedding theme, styled with soft, artistic brushstrokes, pastel tones, delicate washes of color, and a dreamy, romantic, and ethereal aesthetic.",
  "Royal Heritage":
    "A royal heritage wedding theme, conveying majestic grandeur, palatial backdrops, opulent details, rich jewel tones, and a regal, historic, and luxurious ambiance.",
};

// Section 3.13, Principle 1 — never let a style silently default to one culture.
const NEUTRAL_DEFAULT_ATTIRE_PROMPT =
  "elegant, well-tailored formal wedding attire suited to this artistic style — a " +
  "structured jacket/suit for the groom, a flowing gown or fitted ensemble for the " +
  "bride, in colors and embellishment consistent with the chosen art style. Keep " +
  "attire modest and elegant. Do not default to any single culture, region, or " +
  "religious tradition's ceremonial dress unless the user has specifically selected one.";

const COUPLE_GUARD_CLAUSE =
  "\nThere are two distinct people in the reference photo — a bride and a groom. " +
  "Preserve both faces independently and do not merge, swap, or blend their " +
  "features with each other.";

const COUPLE_FACE_FUSION_CLAUSE =
  "Render each person as a separate, individually recognizable figure standing " +
  "side by side or in the same pose as the reference photo. Never merge or " +
  "hybridize their two faces into a single face.";

const GLOBAL_POSITIVE_SUFFIX =
  "Render anatomy naturally and correctly — hands with five clearly separated " +
  "fingers, symmetrical and correctly aligned eyes, a single coherent face per " +
  "person. Keep clothing fully modest and wedding-appropriate, matching the " +
  "coverage level of the reference photo. Preserve each subject's actual " +
  "ethnicity and skin tone exactly as shown in the reference photo. Do not add " +
  "any text, logos, or watermarks to the image.";

export function buildIdentityBlock(imageType: ImageType): string {
  const subject = SUBJECT_DESCRIPTORS[imageType];
  let block =
    `[CRITICAL INSTRUCTION - IDENTITY PRESERVATION]\n` +
    `You MUST perfectly preserve the EXACT facial identity of ${subject} from the reference photo. ` +
    `This is the highest priority. Do not generate a new face. ` +
    `Maintain identical facial structure, eye shape, nose shape, jawline, skin tone, hair color, and distinguishing marks. ` +
    `Do NOT apply any beautification filters, do NOT average the face, and do NOT alter the original ethnicity, age, or likeness. ` +
    `The generated face MUST be completely recognizable as the exact same individual from the reference photo.`;

  if (imageType === "couple") {
    block += COUPLE_GUARD_CLAUSE;
  }
  return block;
}

const SCOPE_BLOCK =
  "SCOPE OF WHAT TO KEEP VS. GENERATE:\n" +
  "Only the facial identity above is preserved from the reference photo. The " +
  "reference photo's clothing, pose, body position, and background are NOT to be " +
  "preserved or referenced — treat them as irrelevant. Generate an entirely new " +
  "pose, wardrobe, and setting as described below, appropriate to the chosen " +
  "illustration style and wedding context.";

function buildWardrobeInstructionForSubject(
  style: StyleConfig,
  attire: AttireConfig | null,
): string {
  const attireBody = attire ? attire.promptBody : NEUTRAL_DEFAULT_ATTIRE_PROMPT;
  return `${attireBody}, rendered with ${style.wardrobeRenderQuality}.`;
}

export function buildWardrobeBlock(
  style: StyleConfig,
  params: BuildPromptParams,
): string {
  if (params.imageType === "couple") {
    const brideAttire = getAttire(params.brideAttireId ?? params.attireId);
    const groomAttire = getAttire(params.groomAttireId ?? params.attireId);
    const brideLine = `Bride: ${buildWardrobeInstructionForSubject(style, brideAttire)}`;
    const groomLine = `Groom: ${buildWardrobeInstructionForSubject(style, groomAttire)}`;
    return `WARDROBE & SETTING:\n${brideLine}\n${groomLine}\n${style.settingInstruction}`;
  }

  const attire = getAttire(params.attireId);
  const wardrobe = buildWardrobeInstructionForSubject(style, attire);
  return `WARDROBE & SETTING:\n${wardrobe}\n${style.settingInstruction}`;
}

export function sanitizeCustomNote(note: string): string {
  const bannedPatterns = [
    /ignore (all|previous|the) instructions?/i,
    /disregard (all|previous|the) instructions?/i,
    /system prompt/i,
    /make (it|them|her|him) look like/i, // celebrity-likeness attempts
  ];
  let cleaned = note;
  for (const pattern of bannedPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }
  return cleaned.trim().slice(0, 300); // hard length cap
}

export function buildPrompt(params: BuildPromptParams): string {
  const style = getStyle(params.styleId);

  const sections = [
    buildIdentityBlock(params.imageType),
    SCOPE_BLOCK,
    `STYLE TRANSFORMATION:\nReimagine the scene in ${style.displayName}: ${style.promptBody}`,
    buildWardrobeBlock(style, params),
    `COMPOSITION:\n${style.framingInstruction} Maintain a wedding-appropriate, celebratory, elegant tone.`,
  ];

  if (params.imageType === "couple") {
    sections.push(`COUPLE HANDLING:\n${COUPLE_FACE_FUSION_CLAUSE}`);
  } else {
    const subject = SUBJECT_DESCRIPTORS[params.imageType];
    sections.push(
      `SINGLE SUBJECT HANDLING:\nGenerate ONLY ${subject} in the image. Do not add a partner or any other people to the scene.`,
    );
  }

  if (params.theme) {
    const themeDescription =
      THEME_DESCRIPTIONS[params.theme] ||
      `A beautiful ${params.theme} wedding theme.`;
    sections.push(
      `THEME:\n${themeDescription} Incorporate this overarching theme into the setting, mood, and aesthetic of the image.`,
    );
  }

  if (params.customStyleNote) {
    const cleaned = sanitizeCustomNote(params.customStyleNote);
    if (cleaned) {
      sections.push(
        `ADDITIONAL USER NOTE (does not override identity/attire rules above):\n${cleaned}`,
      );
    }
  }

  sections.push(`QUALITY & SAFETY:\n${GLOBAL_POSITIVE_SUFFIX}`);

  return sections.join("\n\n");
}

export function getDefaultAspectRatio(styleId: string): string {
  return getStyle(styleId).aspectRatioDefault;
}
