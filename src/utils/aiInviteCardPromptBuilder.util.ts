import { AIEventInviteCard } from "../../generated/prisma/client";
import { getAttire } from "./attireCatelogue.util";
import { buildIdentityBlock, sanitizeCustomNote } from "./promptBuilder.util";

export interface InvitationEventData {
  brideName: string;
  groomName: string;
  eventTitle: string;
  eventDateDisplay: string;
  eventTimeDisplay: string;
  venueName: string;
  venueFullAddress: string;
}

function buildCouplePhotoBlock(record: AIEventInviteCard): string {
  const hasBride = !!record.bride_image;
  const hasGroom = !!record.groom_image;

  if (!hasBride && !hasGroom) {
    return ""; 
  }

  const subjectDescriptor = hasBride && hasGroom ? "the bride and groom" : hasBride ? "the bride" : "the groom";
  const imageType = hasBride && hasGroom ? "couple" : hasBride ? "bride" : "groom";

  let wardrobeInstruction = "";
  if (hasBride && record.bride_attire_style) {
    wardrobeInstruction += `Bride attire: ${getAttire(record.bride_attire_style)?.promptBody || "elegant formal wear"}\n`;
  }
  if (hasGroom && record.groom_attire_style) {
    wardrobeInstruction += `Groom attire: ${getAttire(record.groom_attire_style)?.promptBody || "elegant formal wear"}\n`;
  }

  return `
Incorporate a portrait of ${subjectDescriptor} into the design as a featured framed
photo element (e.g. an oval or arch-framed inset), styled consistently with the card's
overall aesthetic.
${buildIdentityBlock(imageType)}

WARDROBE & SETTING:
${wardrobeInstruction}
  `.trim();
}

export function buildStage1ManualPrompt(record: AIEventInviteCard): string {
  const additionalDetails = record.additional_details ? sanitizeCustomNote(record.additional_details) : "";
  const monogramBlock = record.monogram_style ? `
Include a decorative monogram in the ${record.monogram_style} style, integrated into the design as a graphic
element.
` : "";

  return `
DESIGN BRIEF:
Create a wedding invitation card design in a ${record.design_preset || "beautiful"} aesthetic.
Material/texture: ${record.texture_emulation || "none"}.
Typography style to imply in the composition: ${record.typography_pairing || "elegant"}.
Metallic/foil accents: ${record.metallic_accents || "none"}.
Border/edge treatment: ${record.edge_styling || "none"}.
${additionalDetails}

LAYOUT (critical):
Design the card with a clear compositional hierarchy anticipating where names, date,
time, and venue text will be typeset: reserve a ${record.negative_space || "generous clear"} region in the
${record.text_alignment || "centered"} area of the card for this purpose, styled so text will read clearly
against it (sufficient contrast, no busy ornamentation directly behind it). Do not
attempt to render the actual invitation text, names, dates, or addresses in this pass —
that is handled in a subsequent step with the real event data.
${monogramBlock}

COUPLE PHOTO (only if bride_image and/or groom_image provided):
${buildCouplePhotoBlock(record)}

COMPOSITION:
Portrait orientation suitable for a printed invitation card, 4:5.
Elegant, celebratory, wedding-appropriate tone throughout.
  `.trim();
}

export function buildStage1ExamplePrompt(record: AIEventInviteCard): string {
  const additionalDetails = record.additional_details ? sanitizeCustomNote(record.additional_details) : "";

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

COUPLE PHOTO (only if bride_image and/or groom_image provided):
${buildCouplePhotoBlock(record)}

COMPOSITION:
Match the reference image's orientation and aspect ratio.
  `.trim();
}

export function buildStage2Prompt(record: AIEventInviteCard, eventData: InvitationEventData): string {
  const customMessageBlock = record.custom_message ? `\n- Custom message: "${sanitizeCustomNote(record.custom_message)}"` : "";

  return `
TASK: Add the following event details to this invitation design as clean, legible,
correctly-spelled typeset text, matching the design's existing aesthetic and using the
${record.typography_pairing || "elegant"} style. Do not alter the background artwork, borders, motifs, or
any photo already present — only add text into the areas of the design that were
composed to host it.

EVENT DETAILS (reproduce exactly, character-for-character — do not paraphrase, abbreviate,
reformat, or invent any additional details beyond what is listed here):
- Couple names: ${eventData.brideName} & ${eventData.groomName}
- Date: ${eventData.eventDateDisplay}
- Time: ${eventData.eventTimeDisplay}
- Venue name: ${eventData.venueName}
- Venue address: ${eventData.venueFullAddress}${customMessageBlock}

TEXT ALIGNMENT: ${record.text_alignment || "centered"}.

AVOID:
Adding any names, dates, venues, or details not listed above. Altering the decorative
elements of the base design. Stylizing the address in a way that makes any character
ambiguous (e.g. avoid extreme script fonts for numerals in the address/date).
  `.trim();
}
