import { AIEventInviteCard, Event, Wedding } from "../../generated/prisma/client";
import { getBufferFromS3 } from "../services/aws.service";
import { getAttire, NEUTRAL_DEFAULT_ATTIRE_PROMPT } from "./attireCatelogue.util";
import { getStyle } from "./styleCatelogue.util";
import {
  buildIdentityBlock,
  sanitizeCustomNote,
  COUPLE_FACE_FUSION_CLAUSE,
  GLOBAL_POSITIVE_SUFFIX,
  SUBJECT_DESCRIPTORS,
  SCOPE_BLOCK,
} from "./promptBuilder.util";

export async function fetchImageAsGeminiPart(
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

// export async function buildGeminiParts(
//   record: Partial<AIEventInviteCard>,
//   stage1Prompt: string,
//   isExample: boolean,
// ): Promise<any[]> {
//   const parts: any[] = [{ text: stage1Prompt }];

//   if (isExample && record.reference_image) {
//     const referencePart = await fetchImageAsGeminiPart(record.reference_image);
//     if (referencePart) parts.push(referencePart);
//   }

//   const hasSubjectPhoto = !!record.photo_type && !!record.couple_raw_image_key;
//   if (hasSubjectPhoto) {
//     const subjectPart = await fetchImageAsGeminiPart(
//       record.couple_raw_image_key,
//     );
//     if (subjectPart) parts.push(subjectPart);
//   }

//   return parts;
// }

// function buildCouplePhotoBlock(record: AIEventInviteCard, isExampleMode: boolean = false): string {
//   const photoType = record.photo_type;

//   if (!photoType) {
//     return "";
//   }

//   if (photoType !== "couple" && photoType !== "bride" && photoType !== "groom") {
//     return "";
//   }

//   const subjectDescriptor =
//     photoType === "couple"
//       ? "the bride and groom"
//       : photoType === "bride"
//         ? "the bride"
//         : "the groom";

//   const includeBrideAttire = photoType === "couple" || photoType === "bride";
//   const includeGroomAttire = photoType === "couple" || photoType === "groom";

//   const wardrobeLines: string[] = [];
//   if (includeBrideAttire) {
//     const brideAttire = record.bride_attire_style ? getAttire(record.bride_attire_style) : null;
//     if (record.bride_attire_style && !brideAttire) {
//       console.warn(`Unknown bride_attire_style: ${record.bride_attire_style}`);
//     }
//     wardrobeLines.push(`Bride: ${brideAttire?.promptBody || NEUTRAL_DEFAULT_ATTIRE_PROMPT}`);
//   }
//   if (includeGroomAttire) {
//     const groomAttire = record.groom_attire_style ? getAttire(record.groom_attire_style) : null;
//     if (record.groom_attire_style && !groomAttire) {
//       console.warn(`Unknown groom_attire_style: ${record.groom_attire_style}`);
//     }
//     wardrobeLines.push(`Groom: ${groomAttire?.promptBody || NEUTRAL_DEFAULT_ATTIRE_PROMPT}`);
//   }
//   const wardrobeInstruction = wardrobeLines.join("\n");

//   const identityBlockImageType = photoType as Parameters<typeof buildIdentityBlock>[0];
//   let identityBlock = buildIdentityBlock(identityBlockImageType);

//   let styleInstruction = "";
//   if (record.illustration_style) {
//     const style = getStyle(record.illustration_style);
//     styleInstruction = `\nSTYLE TRANSFORMATION:\nReimagine the couple photo as an illustration in this exact style: ${style.displayName}. ${style.promptBody}\n`;

//     // Override the strict "no beautification" clause of identityBlock to allow illustration
//     identityBlock = identityBlock.replace(
//       `[CRITICAL: STRICT FACE PRESERVATION & IDENTITY CLONING]`,
//       `[CRITICAL: STYLIZED IDENTITY TRANSFER]`
//     );
//     identityBlock = identityBlock.replace(
//       `ROLE: You are a zero-shot face swap / identity transfer engine, not a creative reinterpretation tool.`,
//       `ROLE: You are an elite portrait illustrator. Capture their exact facial geometry in the requested art style.`
//     );
//   }

//   let extraHandling: string;
//   if (photoType === "couple") {
//     extraHandling = `COUPLE HANDLING:\n${COUPLE_FACE_FUSION_CLAUSE}`;
//   } else {
//     const subject = SUBJECT_DESCRIPTORS[photoType];
//     extraHandling =
//       `SINGLE SUBJECT HANDLING:\n` +
//       `Generate ONLY ${subject} in the image. Do NOT add a partner, additional ` +
//       `people, or any other human figures to the scene, even partially visible, ` +
//       `blurred, or in the background. This is a solo portrait — one person, full stop.`;
//   }

//   const exampleModeInstructions = isExampleMode
//     ? `
//   [CRITICAL CHARACTER HANDLING FOR REFERENCE IMAGES — EXAMPLE MODE]

//   [1] DETECTION
//   First determine: does the attached reference image ALREADY contain illustrated
//   character(s) or human figure(s) (e.g., an illustrated couple standing together, a
//   single illustrated figure, etc.)? This includes stylized/illustrated figures, not just
//   photorealistic ones — a cartoon, painted, or vector-style couple still counts as
//   "containing characters."

//   [2] IF THE REFERENCE ALREADY CONTAINS CHARACTER(S)
//   Do NOT create a new framed photo inset. Do NOT generate new attire, new poses, or a
//   new background. This is a face-swap-in-place task, not a new composition task.
//   Instead:
//     a. Preserve EXACTLY as shown in the reference: pose, body position, clothing/attire,
//       body proportions, layout placement, background, and overall illustration style
//       (linework, shading technique, color rendering approach).
//     b. ONLY replace the face(s) of the illustrated character(s) with the facial geometry
//       of the corresponding real person(s) from the provided couple photo — face shape,
//       eyes, nose, lips, jawline, and skin tone should read as that specific person, but
//       rendered in the reference's existing illustration style/medium (e.g. if the
//       reference is painterly, the swapped face must look painted, not photorealistic
//       and pasted on).
//     c. Do NOT change hair style/color, expression, or head angle beyond what's needed to
//       seat the correct identity onto the existing pose — the goal is "the illustrated
//       character now has this real person's face," not "a new portrait of this person."
//     d. CHARACTER-COUNT MATCHING: match the number of illustrated characters to the
//       number of real people provided.
//       - If the reference shows exactly two figures and a couple photo is provided, map
//         one face to each figure, preserving which figure is positioned/dressed as the
//         bride and which as the groom (do not swap which figure gets which face based on
//         left/right position alone — use attire/context cues, e.g. the figure in the
//         gown gets the bride's face).
//       - If the reference shows only ONE figure but a couple photo (two people) is
//         provided, apply only the single most contextually appropriate face (e.g. match
//         by the figure's apparent gender presentation/attire) and leave the other person
//         out — do NOT invent a second figure to fit them in.
//       - If the reference shows MORE figures than provided real people (e.g. a group
//         scene), only swap the faces that clearly correspond to the bride/groom role;
//         leave any other background figures as originally illustrated, unaltered.
//     e. Do NOT distort, restyle, or "clean up" the original illustration's imperfections,
//       linework, or color choices while performing the face swap — only the face region
//       changes; everything else in the image must remain pixel-for-pixel faithful to the
//       reference.

//   [3] IF THE REFERENCE DOES NOT CONTAIN ANY CHARACTERS
//   Proceed with the following framing instructions instead of the above:`
//     : "";

//   return `
//   ${exampleModeInstructions}
//   Incorporate a portrait of ${subjectDescriptor} into the design as a featured framed
//   photo element (e.g. an oval or arch-framed inset), styled consistently with the card's
//   overall aesthetic. The frame styling (shape, border ornamentation, color) must match
//   the design language established elsewhere in the card — do not introduce a frame style
//   that clashes with or ignores the rest of the artwork.

//   ${identityBlock}
//   ${styleInstruction}

//   ${SCOPE_BLOCK}

//   WARDROBE & SETTING (render exactly as specified — do not substitute a different
//   garment style, color, or era even if it seems like a better aesthetic match):
//   ${wardrobeInstruction}

//   ${extraHandling}

//   QUALITY & SAFETY:
//   ${GLOBAL_POSITIVE_SUFFIX}
//     `.trim();
// }

export async function buildGeminiParts(
  record: Partial<AIEventInviteCard>,
  stage1Prompt: string,
  isExample: boolean,
): Promise<any[]> {
  const parts: any[] = [];
  const hasReferenceImage = isExample && !!record.reference_image;
  const hasSubjectPhoto = !isExample && !!record.photo_type && !!record.couple_raw_image_key;

  if (hasReferenceImage) {
    const referencePart = await fetchImageAsGeminiPart(record.reference_image!);
    if (referencePart) {
      parts.push({ text: "[REFERENCE IMAGE — illustrated card design, existing character(s) if any]" });
      parts.push(referencePart);
    } else {
      console.warn("Reference image fetch failed:", record.reference_image);
    }
  }

  if (hasSubjectPhoto) {
    const subjectPart = await fetchImageAsGeminiPart(record.couple_raw_image_key!);
    if (subjectPart) {
      parts.push({ text: "[SUBJECT PHOTO — real face(s) to swap in]" });
      parts.push(subjectPart);
    } else {
      console.warn("Subject photo fetch failed:", record.couple_raw_image_key);
    }
  }

  // Instructions come LAST, after the model has already seen both images
  parts.push({ text: stage1Prompt });

  return parts;
}

function buildCouplePhotoBlock(record: AIEventInviteCard, isExampleMode: boolean = false): string {
  const photoType = record.photo_type;

  if (!photoType) {
    return "";
  }

  if (photoType !== "couple" && photoType !== "bride" && photoType !== "groom") {
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

  const wardrobeLines: string[] = [];
  if (includeBrideAttire) {
    const brideAttire = record.bride_attire_style ? getAttire(record.bride_attire_style) : null;
    if (record.bride_attire_style && !brideAttire) {
      console.warn(`Unknown bride_attire_style: ${record.bride_attire_style}`);
    }
    wardrobeLines.push(`Bride: ${brideAttire?.promptBody || NEUTRAL_DEFAULT_ATTIRE_PROMPT}`);
  }
  if (includeGroomAttire) {
    const groomAttire = record.groom_attire_style ? getAttire(record.groom_attire_style) : null;
    if (record.groom_attire_style && !groomAttire) {
      console.warn(`Unknown groom_attire_style: ${record.groom_attire_style}`);
    }
    wardrobeLines.push(`Groom: ${groomAttire?.promptBody || NEUTRAL_DEFAULT_ATTIRE_PROMPT}`);
  }
  const wardrobeInstruction = wardrobeLines.join("\n");

  const identityBlockImageType = photoType as Parameters<typeof buildIdentityBlock>[0];
  let identityBlock = buildIdentityBlock(identityBlockImageType);

  let styleInstruction = "";
  if (record.illustration_style) {
    const style = getStyle(record.illustration_style);
    styleInstruction = `\nSTYLE TRANSFORMATION:\nReimagine the couple photo as an illustration in this exact style: ${style.displayName}. ${style.promptBody}\n`;

    identityBlock = identityBlock.replace(
      `[CRITICAL: STRICT FACE PRESERVATION & IDENTITY CLONING]`,
      `[CRITICAL: STYLIZED IDENTITY TRANSFER]`
    );
    identityBlock = identityBlock.replace(
      `ROLE: You are a zero-shot face swap / identity transfer engine, not a creative reinterpretation tool.`,
      `ROLE: You are an elite portrait illustrator. Capture their exact facial geometry in the requested art style.`
    );
  }

  let extraHandling: string;
  if (photoType === "couple") {
    extraHandling = `COUPLE HANDLING:\n${COUPLE_FACE_FUSION_CLAUSE}`;
  } else {
    const subject = SUBJECT_DESCRIPTORS[photoType];
    extraHandling =
      `SINGLE SUBJECT HANDLING:\n` +
      `Generate ONLY ${subject} in the image. Do NOT add a partner, additional ` +
      `people, or any other human figures to the scene, even partially visible, ` +
      `blurred, or in the background. This is a solo portrait — one person, full stop.`;
  }

  // ---- Branch A: fresh composition (framed inset, new pose/wardrobe/setting) ----
  const freshCompositionBlock = `
  Incorporate a portrait of ${subjectDescriptor} into the design as a featured framed
  photo element (e.g. an oval or arch-framed inset), styled consistently with the card's
  overall aesthetic. The frame styling (shape, border ornamentation, color) must match
  the design language established elsewhere in the card — do not introduce a frame style
  that clashes with or ignores the rest of the artwork.

  ${identityBlock}
  ${styleInstruction}

  ${SCOPE_BLOCK}

  WARDROBE & SETTING (render exactly as specified — do not substitute a different
  garment style, color, or era even if it seems like a better aesthetic match):
  ${wardrobeInstruction}

  ${extraHandling}`;

  // ---- Branch B: swap-in-place onto existing illustrated characters ----
  const swapInPlaceBlock = `
  [2] IF THE REFERENCE ALREADY CONTAINS CHARACTER(S)
  Do NOT create a new framed photo inset. Do NOT generate new attire, new poses, or a
  new background. This is a face-swap-in-place task, not a new composition task.
  Instead:
    a. Preserve EXACTLY as shown in the reference: pose, body position, clothing/attire,
      body proportions, layout placement, background, and overall illustration style
      (linework, shading technique, color rendering approach).
    b. ONLY replace the face(s) of the illustrated character(s) with the facial geometry
      of the corresponding real person(s) from the provided couple photo — face shape,
      eyes, nose, lips, jawline, and skin tone should read as that specific person, but
      rendered in the reference's existing illustration style/medium (e.g. if the
      reference is painterly, the swapped face must look painted, not photorealistic
      and pasted on).
    c. Do NOT change hair style/color, expression, or head angle beyond what's needed to
      seat the correct identity onto the existing pose.
    d. CHARACTER-COUNT MATCHING:
      - If the reference shows exactly two figures and a couple photo is provided, map
        one face to each figure using attire/context cues (the figure in the gown gets
        the bride's face), not left/right position.
      - If the reference shows only ONE figure but a couple photo (two people) is
        provided, apply only the single most contextually appropriate face and leave
        the other person out — do NOT invent a second figure.
      - If the reference shows MORE figures than provided real people, only swap the
        faces that clearly correspond to the bride/groom role; leave other background
        figures unaltered.
    e. Do NOT distort, restyle, or "clean up" the original illustration's imperfections,
      linework, or color choices — only the face region changes; everything else must
      remain faithful to the reference.
  ${styleInstruction ? `\nNote: apply the requested illustration style only insofar as it's already reflected in the reference's existing medium — do not introduce a different style than what's already there.\n` : ""}
  ${extraHandling}`;

  const exampleModeWrapper = isExampleMode
    ? `
  [CRITICAL CHARACTER HANDLING FOR REFERENCE IMAGES — EXAMPLE MODE]

  [1] DETECTION
  First determine: does the attached reference image ALREADY contain illustrated
  character(s) or human figure(s) (e.g., an illustrated couple standing together, a
  single illustrated figure, etc.)? This includes stylized/illustrated figures, not just
  photorealistic ones — a cartoon, painted, or vector-style couple still counts as
  "containing characters."

  ${swapInPlaceBlock}

  [3] IF THE REFERENCE DOES NOT CONTAIN ANY CHARACTERS
  Use the following instructions instead of [2] above:
  ${freshCompositionBlock}
  `
    : freshCompositionBlock;

  return `
  ${exampleModeWrapper}

  QUALITY & SAFETY:
  ${GLOBAL_POSITIVE_SUFFIX}
    `.trim();
}

import { getDesignPreset, getTextureEmulation, getMetallicAccents, getNegativeSpace, getMonogramStyle, getEdgeStyling } from "./manualDesignCatalogue.util";

export async function buildStage1ManualPrompt(
  record: Partial<AIEventInviteCard>,
): Promise<string> {
  const additionalDetails = record.additional_details
    ? sanitizeCustomNote(record.additional_details)
    : "";

  const couplePhotoBlock = buildCouplePhotoBlock(record as AIEventInviteCard);
  const couplePhotoSection = couplePhotoBlock
    ? `\nCOUPLE PHOTO (only if photoType is provided):\n${couplePhotoBlock}\n` +
      `[CRITICAL: FACE SWAP INSTRUCTION]\n` +
      `You MUST use the exact faces from the attached [SUBJECT PHOTO] for the characters in this illustration.\n` +
      `Do not generate generic faces. Replicate the facial structure, skin tone, hair, and likeness of the people in the [SUBJECT PHOTO] perfectly.\n` +
      `If you generate characters, their faces must be an identical match to the provided reference photo.\n`
    : "";

  const designPresetRaw = record.design_preset || "Classic Elegant Wedding";
  const designPreset = getDesignPreset(designPresetRaw);
  
  const textureValue = record.texture_emulation ? getTextureEmulation(record.texture_emulation) : "";
  const texture = textureValue ? `Texture: ${textureValue}` : "";
  
  const metallicValue = record.metallic_accents ? getMetallicAccents(record.metallic_accents) : "";
  const metallics = metallicValue ? `Metallic Accents: ${metallicValue}` : "";
  
  const negativeSpaceValue = record.negative_space ? getNegativeSpace(record.negative_space) : "";
  const negativeSpace = negativeSpaceValue ? `Negative Space Strategy: ${negativeSpaceValue}` : "";
  
  const monogramValue = record.monogram_style ? getMonogramStyle(record.monogram_style) : "";
  const monogram = monogramValue ? `Monogram/Crest Style: ${monogramValue}` : "";
  
  // Note: text_alignment is just passed as-is if present
  const alignment = record.text_alignment ? `Text Alignment: ${record.text_alignment}` : "";
  
  const edgeValue = record.edge_styling ? getEdgeStyling(record.edge_styling) : "";
  const edge = edgeValue ? `Edge Styling: ${edgeValue}` : "";

  return `
  [MANUAL DESIGN GENERATION — BACKGROUND ARTWORK ONLY, ZERO TEXT]
  Create a completely new, original invitation background design based on the following
  stylistic parameters. Do NOT include any actual text, names, dates, or addresses.

  AESTHETIC & THEME:
  - Base Theme/Preset: ${designPreset}
  ${texture ? `- ${texture}` : ""}
  ${metallics ? `- ${metallics}` : ""}
  ${monogram ? `- ${monogram}` : ""}
  ${edge ? `- ${edge}` : ""}
  ${additionalDetails}

  LAYOUT & NEGATIVE SPACE (structure only, no text this pass):
  ${negativeSpace ? `- ${negativeSpace}` : ""}
  ${alignment ? `- ${alignment}` : ""}
  Leave clear, elegant negative space for the eventual event details to be typeset later.
  Do NOT render any text. Do NOT invent, sketch, or fake placeholder text, lorem ipsum,
  squiggle-text, or illegible glyphs of any kind in this pass — leave those regions as
  clean, empty negative space (background/ornamental treatment only, no letterforms).

  ${couplePhotoSection}
  ANATOMY & PROPORTIONS (if any people/figures are generated):
  - Realistic, photorealistic human proportions only.
  - Exactly one coherent, undistorted face per person — no duplicated, merged, or
    blended facial features.
  - Hands (if visible): exactly five clearly separated fingers per hand.

  COMPOSITION:
  Generate the artwork in a strict 9:16 vertical aspect ratio (1080 x 1920px, portrait
  orientation). The full canvas must be filled edge-to-edge at this ratio.
  `.trim();
}

export async function buildStage1ExamplePrompt(
  record: Partial<AIEventInviteCard>,
): Promise<string> {
  const additionalDetails = record.additional_details
    ? sanitizeCustomNote(record.additional_details)
    : "";

  const couplePhotoBlock = buildCouplePhotoBlock(record as AIEventInviteCard, true);
  const couplePhotoSection = couplePhotoBlock
    ? `\nCOUPLE PHOTO (only if photoType is provided):\n${couplePhotoBlock}\n`
    : "";

  return `
  [REFERENCE IMAGE REPLICATION — EXACT DESIGN MATCH, ZERO TEXT]
  Your primary task is to faithfully recreate the EXACT invitation design from the attached reference image, but with ALL text completely removed. You must act as a precise layout cloner, preserving the original artwork as perfectly as possible.

  WHAT TO REPLICATE EXACTLY:
  - The exact color palette, background textures, and gradients.
  - The exact ornamental motifs, decorative elements (florals, borders, filigree, icons), and illustrations pixel-for-pixel as much as possible.
  - The exact layout, framing, and placement of all visual elements.
  - The overall aesthetic mood, scale, and structural hierarchy of the reference.

  WHAT TO REMOVE (hard bans — zero tolerance):
  - Do NOT include any text, names, initials, dates, times, addresses, or venue details visible in the reference image.
  - Erase or omit all text completely, leaving those areas as clean negative space or extending the background pattern seamlessly where the text used to be.
  - Do NOT invent, sketch, or fake placeholder text, lorem ipsum, squiggle-text, or illegible glyphs of any kind.
  - If the reference appears to be a real couple's actual invitation, treat all names/dates/locations in it as strictly off-limits.
  ${additionalDetails}

  LAYOUT (structure only, no text this pass):
  Preserve the reference image's exact approach to text placement and negative space. The regions where text existed in the reference must be left as clean open space for text. Rendering fake or illegible text is a failure, since the typesetting step assumes a clean canvas.
  ${couplePhotoSection}
  ANATOMY & PROPORTIONS (if any people/figures are generated):
  - Realistic, photorealistic human proportions only — this overrides any stylistic instruction elsewhere in this prompt.
  - Exactly one coherent, undistorted face per person.
  - Any anatomical error here constitutes a complete failure.

  COMPOSITION:
  Generate the artwork in a strict 9:16 vertical aspect ratio (1080 x 1920px, portrait orientation). The full canvas must be filled edge-to-edge at this ratio. Match the reference image's overall layout structure and negative-space regions exactly within this 9:16 canvas.

  FAILURE CONDITION:
  Success = a viewer would say "this is an exact copy of the reference design, just with the text removed." If the output fails to copy the reference content, renders any text/fake text, or contains anatomical errors, it is a failure.
    `.trim();
}

export function buildStage2TextPrompt(
  record: Partial<AIEventInviteCard>,
  event: Event,
  wedding: Wedding,
  isExampleMode: boolean = false
): string {
  const bride = wedding.bride_name;
  const groom = wedding.groom_name;

  // Format the date if it's available
  const dateStr = event.date instanceof Date ? event.date.toDateString() : String(event.date);

  const customMessage = record.custom_message
    ? `\nCustom Message: "${record.custom_message}"`
    : "";

  return `
  [STRICTLY ENFORCED RULE — CRITICAL INSTRUCTION — EXACT TEXT RENDERING]
  You are a master typographer. A base invitation design image has been provided.
  Your ONLY job in this pass is to typeset the exact event details below onto the
  existing artwork. This is a typesetting task, not a creative writing task.

  [1] EXACT TEXT — CHARACTER-FOR-CHARACTER, ZERO TOLERANCE
  The text below must be rendered EXACTLY as written — every letter, every space,
  every punctuation mark, every diacritic. This includes:
  - Exact spelling of every name (do not "correct," simplify, anglicize, or
    auto-complete any name into a more common spelling)
  - Exact date and time formatting as given — do not reformat, abbreviate, expand,
    or convert the date/time style
  - Exact venue, city, and address text, including punctuation

  Do NOT hallucinate, substitute, invent, autocomplete, paraphrase, translate, or
  "improve" ANY word in the text below. Do NOT add honorifics, titles, extra words,
  emojis, or decorative text that isn't explicitly listed here. If a field looks
  unusual or misspelled to you, render it exactly as given anyway — it is not your
  job to correct it.

  EXACT TEXT TO RENDER:
  Event: "${event.title}"
  Names: "${bride} & ${groom}"
  Date: "${dateStr}"
  Time: "${event.time}"
  Location: "${event.venue}, ${event.city}"
  Address: "${event.address}"${customMessage}

  Do NOT render any text other than what is listed above. Do NOT add placeholder
  labels (e.g., do not write the word "Date:" or "Time:" unless it is part of the
  design's existing style) unless such labels are a natural part of the invitation
  convention — render values as invitation copy, not as a form.

  [2] TYPOGRAPHY & COMPOSITION
  ${isExampleMode ? `1. You have been provided with TWO images: the original REFERENCE IMAGE (which contains text) and the text-less BASE DESIGN.
  2. Your job is to typeset the text onto the text-less BASE DESIGN.
  3. You MUST match the EXACT font family, font style, font weights, font colors, text alignment, spacing, and typography hierarchy seen in the original REFERENCE IMAGE.
  4. If the reference image used a specific calligraphy or serif font for names, use that exact style.` : `1. Place this exact text only in the designated negative-space regions of the
    provided artwork — do not shrink, crop, or reflow the existing illustrations
    to make room; text must fit within the space the design already allocates.
  2. Use a single elegant, highly legible font family (e.g. serif or modern script)
    consistent with the mood of the design. Do not mix more than two font
    families/weights across the card.`}
  5. "${bride} & ${groom}" must be the single most visually prominent text element
    on the card — largest size and/or highest visual weight of all text.
  6. All other text (event, date, time, location, address, custom message) must be
    clearly legible at normal viewing size — no font so small, thin, or ornate
    that characters become ambiguous or illegible.
  7. Text color must be drawn from the artwork's existing palette (e.g. a dominant
    accent like gold, deep green, or navy) so it reads as native to the design —
    never pure default black or white unless that color is already part of the
    palette. The chosen color must maintain strong contrast against its immediate
    background for legibility.
  8. Do NOT alter, redraw, recolor, resize, or reposition the underlying artwork,
    illustrations, borders, or motifs from the base image in any way — this pass
    only adds text on top of the existing design.
  9. Do NOT introduce any new watermark, logo, or attribution mark.

  [3] COMPOSITION
  Final output must remain in a strict 9:16 vertical aspect ratio (1080 x 1920px),
  matching the base image's canvas exactly — no re-cropping, re-scaling, or
  letterboxing relative to the input artwork.

  [4] FAILURE CONDITION
  Any deviation from the exact text above (misspelling, wrong date/time format,
  omitted or added words, altered names) is a complete failure, regardless of how
  good the typography looks. Illegible text, altered artwork, or an aspect ratio
  mismatch are also complete failures.
    `.trim();
}
