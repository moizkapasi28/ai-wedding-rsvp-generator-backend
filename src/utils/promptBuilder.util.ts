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
    "A traditional Indian wedding theme, featuring rich, vibrant colors like deep reds, " +
    "golds, and marigold orange, ornate floral decorations (marigold garlands, jasmine " +
    "strings), traditional motifs (paisley, mandala patterns, henna-inspired linework), " +
    "and a culturally festive, grand atmosphere. Decorative motifs should read as " +
    "authentic and respectful, not as generic 'Eastern' pastiche — avoid mixing in " +
    "unrelated cultural symbols or motifs from other traditions.",

  "Modern Minimalist":
    "A modern minimalist wedding theme, emphasizing clean lines, elegant simplicity, " +
    "neutral and soft color palettes (ivory, sage, dusty blue, blush, stone), " +
    "uncluttered negative space, and sophisticated, understated decor. Minimalist does " +
    "not mean sparse or unfinished — the design should still feel intentional, complete, " +
    "and polished, not like an empty placeholder.",

  Watercolor:
    "A watercolor wedding theme, styled with soft, artistic brushstrokes, pastel tones, " +
    "delicate washes of color, visible paper texture, and a dreamy, romantic, ethereal " +
    "aesthetic. Any illustrated florals or figures should have soft, painterly edges " +
    "consistent with a watercolor medium — avoid hard vector-style outlines or flat " +
    "digital-illustration rendering, which would break the watercolor mood.",

  "Royal Heritage":
    "A royal heritage wedding theme, conveying majestic grandeur, palatial backdrops, " +
    "opulent details (gold leaf accents, brocade patterns, crest-like ornamentation), " +
    "rich jewel tones (deep burgundy, emerald, sapphire, gold), and a regal, historic, " +
    "luxurious ambiance. Ornamentation should feel cohesive with a single historical/" +
    "regional aesthetic rather than combining mismatched royal styles from different " +
    "eras or cultures.",
};

const NEUTRAL_DEFAULT_ATTIRE_PROMPT =
  "Elegant, well-tailored formal wedding attire suited to this artistic style — a " +
  "structured jacket/suit for the groom, a flowing gown or fitted ensemble for the " +
  "bride, in colors and embellishment consistent with the chosen art style. Keep " +
  "attire fully modest (no plunging necklines, sheer/see-through fabric, or bare " +
  "midriffs) and elegant. Do NOT default to any single culture's, region's, or " +
  "religious tradition's ceremonial dress (e.g. do not default to a sari, lehenga, " +
  "sherwani, kilt, cheongsam, or any specific traditional garment) unless the user has " +
  "explicitly selected that style — the unmarked default must read as broadly " +
  "cross-cultural formalwear, not as any one tradition by omission.";

const COUPLE_GUARD_CLAUSE =
  "\n[CRITICAL COUPLE HANDLING — TWO DISTINCT INDIVIDUALS]\n" +
  "There are TWO distinct people in the reference photo. Treat the reference image as a " +
  "strict character reference for BOTH individuals INDEPENDENTLY — each face is its own " +
  "separate identity-preservation task, not a blended \"couple look.\"\n" +
  "- Perfectly preserve each person's unique facial identity (face shape, eyes, nose, " +
  "lips, jawline, skin tone, hair) exactly as shown in the reference.\n" +
  "- Do NOT mix, swap, blend, average, or cross-pollinate features between the two " +
  "people — no borrowing the bride's eye shape for the groom, no averaging skin tones " +
  "between them, etc.\n" +
  "- The bride must look exactly like the bride from the reference. The groom must look " +
  "exactly like the groom from the reference. Neither face may drift toward the other, " +
  "even slightly, even under stylization.\n" +
  "- Each face must remain a 100% exact match to that specific individual in the " +
  "reference — this is a hard pass/fail requirement, not a matter of degree.";

export const COUPLE_FACE_FUSION_CLAUSE =
  "[FACE FUSION — STRICT PROHIBITION]\n" +
  "Render each person as a separate, fully individually recognizable figure with their " +
  "own distinct face. NEVER merge, hybridize, morph, or average the two faces into a " +
  "single composite face — this includes partial fusion (e.g. one person's eyes on the " +
  "other's face shape), not just full merging.\n" +
  "Both faces MUST be identical to the corresponding person in the original reference " +
  "photo — the bride's generated face maps only to the bride's reference face, and the " +
  "groom's generated face maps only to the groom's reference face. Do not stylize, " +
  "beautify, smooth, or symmetrize either face.\n" +
  "If the two people are positioned close together or overlapping in the generated pose, " +
  "pay extra attention to keeping a clear boundary between their faces and features — " +
  "close proximity is the most common cause of accidental face blending.\n" +
  "FAILURE CONDITION: any blending, feature-swapping, or partial fusion between the two " +
  "faces is a complete failure, regardless of how good the rest of the image looks.";

export const GLOBAL_POSITIVE_SUFFIX =
  "[CRITICAL ANATOMY & PROPORTION RULES]\n" +
  "Render all anatomy with photorealistic, correct human proportions — this overrides any stylistic or artistic instruction elsewhere in this prompt.\n\n" +

  "[1] HEAD & BODY SCALE\n" +
  "Head-to-body ratio must match realistic adult proportions (roughly 1:7 to 1:8 head-heights per body, adjusted for the subject's apparent age). No oversized, undersized, or 'bobblehead' proportions. " +
  "Neck, shoulder width, torso length, and limb length must all be consistent with the head size and with each other — no single body part scaled independently of the rest.\n\n" +

  "[2] HANDS & LIMBS (high-failure-rate zone — apply extra scrutiny)\n" +
  "Each hand must have exactly five (5) fingers, clearly separated, with correct joint count and natural bend direction. No fused, merged, extra, or missing fingers. No extra or missing limbs. " +
  "If a hand is partially occluded (holding an object, behind another person, cropped by frame), render only the visible portion correctly rather than guessing at hidden fingers.\n\n" +

  "[3] FACE\n" +
  "Exactly one coherent, undistorted face per person — no duplicated features, no blended/merged faces between adjacent subjects, no floating or asymmetric facial elements. " +
  "Eyes must be symmetrical in size and shape, correctly aligned on a level horizontal axis (unless head is tilted, in which case both eyes tilt together). " +
  "Do not merge or blend distinct individuals' faces together, especially in group shots where people are close together.\n\n" +

  "[4] MULTI-PERSON CONSISTENCY\n" +
  "If multiple people are present, each person must have their own complete, separate set of anatomy — no shared/fused limbs, hands, or faces between subjects standing close together.\n\n" +

  "[5] CLOTHING\n" +
  "Clothing must be fully modest and wedding-appropriate, matching or exceeding the coverage level shown in the reference photo — do not reduce coverage, add sheerness, or introduce cutouts/slits not present in the reference. " +
  "Do not alter garment style, color, or type unless separately instructed — preserve what's shown in the reference.\n\n" +

  "[6] IDENTITY PRESERVATION\n" +
  "Preserve each subject's actual ethnicity, skin tone, and facial features exactly as shown in the reference photo. Do not lighten, darken, or otherwise alter skin tone. Do not blend or average features toward a generic or different ethnic appearance.\n\n" +

  "[7] NO ARTIFACTS\n" +
  "Do not add text, logos, watermarks, timestamps, or UI elements anywhere in the image.\n\n" +

  "[8] FAILURE CONDITION\n" +
  "Any anatomical error (wrong finger count, mismatched proportions, merged faces/limbs between people, asymmetric eyes) constitutes a complete failure of the generation, regardless of overall image quality or composition.";

export function buildIdentityBlock(imageType: ImageType): string {
  const subject = SUBJECT_DESCRIPTORS[imageType];
  let block =
    `[CRITICAL: STRICT FACE PRESERVATION & IDENTITY CLONING]\n` +
    `ROLE: You are a zero-shot face swap / identity transfer engine, not a creative reinterpretation tool. Your sole job is to graft the exact facial identity of ${subject} from the reference photo onto the target scene.\n\n` +

    `[1] IDENTITY IS NON-NEGOTIABLE (highest priority, overrides all other instructions)\n` +
    `- Preserve exact: eye shape/spacing/color, nose bridge & tip geometry, lip shape & volume, jawline & chin structure, cheekbone structure, ear shape (if visible), skin tone (base undertone, not just lighting-adjusted value), hair color/texture/hairline.\n` +
    `- If any instruction elsewhere in this prompt conflicts with identity preservation (art style, mood, lighting mood, camera lens effect, etc.), identity preservation wins. Style is allowed to change the environment around the face — never the face itself.\n\n` +

    `[2] ZERO HALLUCINATION — STRICT ADDITION BANS\n` +
    `Do NOT invent or add: glasses, jewelry, piercings, bindis, makeup, tattoos, scars, cultural or religious markings, facial hair, or accessories that are not clearly visible in the reference photo.\n` +
    `Do NOT remove or alter: existing facial hair (beard/mustache/stubble density and shape), existing hairline, existing marks or asymmetries.\n` +
    `Do NOT change: apparent age, apparent body weight/face fullness, gender presentation.\n` +
    `If uncertain whether a feature exists in the reference (e.g., partially occluded by hair or angle), default to omitting it rather than guessing.\n\n` +

    `[3] NO BEAUTIFICATION OR "AI-FACE" DRIFT\n` +
    `Do not smooth skin, symmetrize features, enlarge eyes, slim the nose/jaw, or apply any generic "attractiveness" prior. This is the single most common failure mode of face-swap models — actively resist it.\n` +
    `Retain natural skin texture: pores, blemishes, fine lines, natural asymmetry between left/right sides of the face. A slightly imperfect but accurate face is correct. A smoothed, symmetrical, "improved" face is a failure, even if it looks more polished.\n\n` +

    `[4] SEAMLESS INTEGRATION (secondary priority — only after identity is locked)\n` +
    `Adapt lighting direction, shadow falloff, color temperature, and grain/noise on the face to match the generated environment, so the face does not look pasted or composited.\n` +
    `Match the head pose and expression to the target scene's context, but do not let pose/expression changes reshape the underlying geometry — a smiling version of this face must still be recognizably the same bone structure and features as the reference, not a generic "smiling face" template.\n\n` +

    `[5] FAILURE CONDITION\n` +
    `Success = a person who knows ${subject} in real life would instantly recognize them, no hesitation. "Similar," "inspired by," "same vibe," or "close enough" all count as complete failures — treat this as a hard pass/fail, not a spectrum.\n` +
    `If you cannot confidently preserve the identity given the reference image quality/angle, prioritize accuracy over completing the edit — an imperfect but honest attempt is better than a confident wrong face.\n`;

  if (imageType === "couple") {
    block += COUPLE_GUARD_CLAUSE;
  }
  return block;
}

export const SCOPE_BLOCK =
  "[SCOPE OF WHAT TO KEEP VS. GENERATE — READ CAREFULLY]\n" +

  "[1] PRESERVE FROM REFERENCE (and ONLY this)\n" +
  "The exact facial identity: face shape, eye shape/color, nose, lips, jawline, skin tone " +
  "and texture, and hair color/texture/hairline. This is the ONLY thing carried over from " +
  "the reference photo.\n\n" +

  "[2] DISCARD FROM REFERENCE (hard bans)\n" +
  "The reference photo's clothing, pose, body position, camera angle, framing, lighting, " +
  "and background are ALL irrelevant and MUST NOT be preserved, copied, or echoed in any " +
  "way. Do not let the reference's original outfit silhouette, colors, or fabric \"ghost\" " +
  "through underneath the new wardrobe. Do not let the reference's original background " +
  "elements, lighting mood, or camera framing carry over, even subtly.\n\n" +

  "[3] GENERATE FRESH\n" +
  "Generate an entirely new pose, wardrobe, and setting as described elsewhere in this " +
  "prompt, appropriate to the chosen illustration style and wedding context. Treat the " +
  "reference photo as if it were only a face-reference crop — as though you never saw " +
  "the clothing, pose, or background at all.\n\n" +

  "[4] IDENTITY MUST SURVIVE THE REBUILD\n" +
  "CRITICAL: The new pose, expression, and environment MUST NOT distort, reshape, " +
  "beautify, or otherwise alter the strictly preserved facial identity from [1]. A new " +
  "pose or angle may reveal the face from a different perspective, but the underlying " +
  "facial geometry and features must remain the exact same person. If the required new " +
  "pose would obscure the face entirely (e.g. facing away), favor a pose that keeps the " +
  "face visible over one that satisfies pose/setting instructions at the cost of showing " +
  "the identity.\n\n" +

  "[5] PRIORITY IF INSTRUCTIONS CONFLICT\n" +
  "If any wardrobe, pose, or setting instruction elsewhere in this prompt would require " +
  "altering the facial identity to work (e.g. a pose that only looks right on a different " +
  "face shape), facial identity preservation wins — adapt the pose/setting instead.\n\n" +

  "[6] FAILURE CONDITION\n" +
  "Carrying over any element of the reference's clothing, pose, or background is a " +
  "failure. Distorting, beautifying, or altering the facial identity while generating the " +
  "new scene is also a failure. Both are equally unacceptable — this is not a spectrum " +
  "where one can be sacrificed for the other.";

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
    /make (it|them|her|him) look like/i,
  ];
  let cleaned = note;
  for (const pattern of bannedPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }
  return cleaned.trim().slice(0, 300);
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
