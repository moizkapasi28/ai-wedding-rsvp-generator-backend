# AI Wedding Invitation Generator — Prompt Engineering Spec

**Feature:** Generate an invitation card image for an event, in one of two modes:
- **MANUAL** — user specifies design parameters (per your `AIEventInviteCard` schema); event details (names, date/time, venue) are pulled from the DB by `event_id`.
- **EXAMPLE** — user uploads a reference invitation image; the system replicates its style, applies the same DB-sourced event details, and optionally adds the couple's photo.

Both modes optionally include the couple's photo (face-preserved per the illustration spec) and both can be **saved without generating an image** (design parameters persisted, `generated_image` left null, generated later).

This doc assumes `gemini-3.1-flash-image` and reuses the identity-lock / attire-catalog machinery from the companion doc, `wedding-illustration-prompt-engineering-spec.md` — refer to that for the couple-photo face-fidelity logic; this doc covers what's specific to invitations: **event-data injection and text accuracy**.

---

## 1. The architecture decision that comes before any prompt: how is text rendered?

This is the single most important decision for this feature, so it goes first.

**The problem:** an invitation's text (bride/groom names, date, time, full venue address, custom message) has to be **factually exact** — it's copied from your database, not invented. Gemini 3.1 Flash Image's own model card states text rendering is still weak for **small text, long paragraphs, and page-length content**, even though short marketing-style text renders with reasonably high accuracy. A full street address ("B-42, Sector 15, Near City Mall, Ahmedabad, Gujarat 380015") is exactly the kind of long, small, precision-critical string most likely to come back with a dropped digit or a misspelled locality — and guests will use that address to physically show up somewhere.

**Recommended architecture: hybrid rendering.**
1. **AI generates the decorative artwork only** — background, borders, floral/geometric motifs, the couple's photo integrated into the design, color palette, typography *style* (as a visual aesthetic, not as literal rendered guest-facing data) — guided by the design parameters or reference image.
2. **Your backend overlays the real text programmatically** — names, date, time, full address, custom message — using an image composition step (e.g. `sharp` + SVG, or `node-canvas`) with a font matching the chosen `typography_pairing`, positioned in a text-safe zone the AI was instructed to leave clear.
3. This gives you pixel-perfect, guaranteed-correct guest-facing text, while still getting a fully AI-designed, bespoke-looking card.

**When pure AI-rendered text is acceptable:** short, low-stakes, decorative text only — e.g. "Save the Date," a monogram, or the couple's first names alone in large display type — where a stylistic font treatment matters more than exact reproduction and a human will proofread before send. Long addresses, full dates, and custom paragraphs should not go through this path in v1.

**What this means for prompts below:** every `MANUAL`/`EXAMPLE` prompt template explicitly instructs the model to **leave a clear, uncluttered negative-space zone** for text rather than asking it to render the text itself, and a separate text-overlay step (Section 6) handles the actual words. I'll flag the one exception (decorative names/monogram) where AI rendering is reasonable.

---

## 2. Step 1: Resolve `event_id` into a structured `InvitationEventData` object

Both modes start the same way — the client sends only `event_id` (and, for EXAMPLE mode, the reference image + generation mode flag). Your backend resolves everything else from the DB before building any prompt.

```typescript
interface InvitationEventData {
  brideName: string;
  groomName: string;
  eventTitle: string;           // e.g. "The Wedding of Ayesha & Vikram"
  eventDateTimeISO: string;     // stored value
  eventDateDisplay: string;     // pre-formatted for display, e.g. "12th December 2026"
  eventTimeDisplay: string;     // e.g. "6:00 PM onwards"
  venueName: string;            // from Google Places, e.g. "Taj Lands End"
  venueFullAddress: string;     // formatted_address from Places/Geocoding
  venueShortAddress?: string;   // city/area only — useful for card front, full address for card back/insert
}

async function resolveInvitationEventData(eventId: string): Promise<InvitationEventData> {
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId } });
  return {
    brideName: event.bride_name,
    groomName: event.groom_name,
    eventTitle: event.title,
    eventDateTimeISO: event.event_datetime.toISOString(),
    eventDateDisplay: formatDate(event.event_datetime),   // "12th December 2026"
    eventTimeDisplay: formatTime(event.event_datetime),   // "6:00 PM onwards"
    venueName: event.venue_name,
    venueFullAddress: event.venue_formatted_address,       // from Places/Geocoding, already stored
    venueShortAddress: event.venue_city_area,              // derive/store separately if you want a shorter card-front version
  };
}
```

Do this resolution **once**, at the top of the request handler, regardless of `generation_mode` — both MANUAL and EXAMPLE need it, and it should never be something the client can override (client only ever passes `event_id`, never the name/date/venue text directly — this also prevents a client from injecting arbitrary text into the prompt for a different event than they have permission for).

---

## 3. Step 2: MANUAL mode — mapping your schema fields to the prompt

Your schema's design fields map directly to prompt fragments. Here's the field-by-field mapping:

| Schema field | Prompt role |
|---|---|
| `design_preset` | Overall aesthetic category (e.g. "botanical minimalist," "royal gold foil," "modern geometric") — selects a base template, similar to `style_id` in the illustration feature |
| `texture_emulation` | Material/texture cue (e.g. "hand-pressed cotton paper texture," "foil-stamped," "linen card stock") |
| `typography_pairing` | Describes the *visual style* of typography for the AI to imply as design language (e.g. "elegant serif headline with a delicate script accent") — NOT the literal text, per Section 1 |
| `metallic_accents` | e.g. "rose gold foil edging," "subtle gold leaf accents," or `null`/"none" |
| `negative_space` | Explicit instruction on how much clear area to leave — this directly feeds the text-safe-zone instruction from Section 1 |
| `monogram_style` | If set, a couple's monogram design (e.g. interlocking initials) — this is one case where short AI-rendered text (2 initials) is reasonable |
| `text_alignment` | Layout hint: "centered," "left-aligned," "asymmetric" — informs both the AI layout and your text-overlay step's positioning, so they agree |
| `edge_styling` | Border/edge treatment (e.g. "deckled edge," "scalloped border," "clean rectangular") |
| `additional_details` | Free-text field for anything else the user wants to add — sanitize before use (Section 7) |
| `custom_message` | The couple's personal message — rendered via text overlay (Section 6), NOT by the AI directly |
| `bride_image` / `groom_image` | Optional face references — reuse the illustration spec's identity-lock + couple-guard logic |
| `bride_attire_style` / `groom_attire_style` | Same attire catalog as the illustration feature |

### 3.1 MANUAL mode prompt template

```
DESIGN BRIEF:
Create a wedding invitation card design in a {{design_preset}} aesthetic.
Material/texture: {{texture_emulation}}.
Typography style (visual character only, not literal text): {{typography_pairing}}.
Metallic/foil accents: {{metallic_accents}}.
Border/edge treatment: {{edge_styling}}.
{{additional_details}}

LAYOUT & TEXT-SAFE ZONE (critical):
Leave a clearly defined, uncluttered {{negative_space}} area in the {{text_alignment}}
region of the card, free of decorative elements, for text to be added afterward. Do not
render any invitation text, names, dates, or addresses yourself — leave this area as
clean negative space matching the card's background treatment.
{{IF_MONOGRAM}}
Include a decorative monogram in the {{monogram_style}} style using the initials
"{{bride_initial}}" and "{{groom_initial}}", integrated into the design as a graphic
element (not as body text).
{{END_IF_MONOGRAM}}

COUPLE PHOTO (only if bride_image and/or groom_image provided):
{{COUPLE_PHOTO_BLOCK}}
<!-- Reuse identity-lock + attire composition from the illustration spec, Section 2 & 3.13 -->

COMPOSITION:
Portrait orientation suitable for a printed invitation card, {{aspect_ratio}}.
Elegant, celebratory, wedding-appropriate tone throughout.

AVOID:
Rendering any small or paragraph-length text directly (per the text-safe-zone
instruction above). Clashing or cluttered ornamentation that would compete with the
text overlay region.
```

**`COUPLE_PHOTO_BLOCK` composition logic:**
```typescript
function buildCouplePhotoBlock(record: AIEventInviteCard): string {
  const hasBride = !!record.bride_image;
  const hasGroom = !!record.groom_image;

  if (!hasBride && !hasGroom) {
    return ""; // no photo section at all — do not invent a couple photo
  }

  const subjectDescriptor =
    hasBride && hasGroom ? "the bride and groom" : hasBride ? "the bride" : "the groom";

  // Reuse buildWardrobeInstruction() and the identity-lock block from the
  // illustration spec — attireId comes from bride_attire_style / groom_attire_style.
  return `
Incorporate a portrait of ${subjectDescriptor} into the design as a featured framed
photo element (e.g. an oval or arch-framed inset), styled consistently with the card's
overall aesthetic. ${buildIdentityLockClause(subjectDescriptor)}
${buildWardrobeInstruction(record)}
  `.trim();
}
```

This is important: **if neither `bride_image` nor `groom_image` is present, the photo block is omitted entirely** — don't have the model invent generic stock-photo people for a wedding invitation; it looks fake and isn't what was asked for.

---

## 4. Step 3: EXAMPLE mode — reference-image style replication

In this mode the user uploads an existing invitation as a style reference, plus a `generation_mode: "EXAMPLE"` flag. The schema's `reference_image` field holds this upload. Design-parameter fields (`design_preset`, `texture_emulation`, etc.) are typically **not** used in this mode — the reference image *is* the design spec — though nothing stops you from letting a user nudge the reference with `additional_details` if you want that flexibility.

### 4.1 EXAMPLE mode prompt template

```
REFERENCE-STYLE REPLICATION:
Using the attached reference invitation image as a style guide, create a new invitation
design that closely follows its visual style — color palette, ornamental motifs, border
treatment, layout structure, and overall aesthetic mood. Do not copy any text, names,
dates, or addresses visible in the reference image — replicate the DESIGN LANGUAGE only,
not its content.
{{additional_details}}

LAYOUT & TEXT-SAFE ZONE (critical):
Preserve the reference image's approach to text placement and negative space, but leave
those regions completely blank/clean in your output — no text of any kind. This blank
space will be filled with different text afterward.

COUPLE PHOTO (only if bride_image and/or groom_image provided):
{{COUPLE_PHOTO_BLOCK}}
<!-- Same composition logic as Section 3.1 — omit entirely if neither image is provided -->

COMPOSITION:
Match the reference image's orientation and aspect ratio unless {{aspect_ratio}} is
explicitly requested otherwise.

AVOID:
Reproducing any of the reference image's own text, names, or identifying details.
Rendering new text directly (handled by a separate overlay step).
```

**Why explicitly forbid copying the reference's text:** the reference invitation almost certainly belongs to a different couple, with a different date/venue — without this instruction, an image-edit model asked to "replicate this design" will often literally copy visible text characters, which would put a stranger's name or a copyrighted design's identifying details into your user's card. This is both a correctness bug and a subtle copyright/privacy issue worth guarding against explicitly.

### 4.2 EXAMPLE mode API call shape

```typescript
const contents = [
  {
    role: "user",
    parts: [
      { text: exampleModePrompt },
      { inlineData: { mimeType: referenceImageMimeType, data: referenceImageBase64 } },
      // If couple photos are provided, include them as additional reference images —
      // gemini-3.1-flash-image supports multiple reference images in one call.
      ...(brideImageBase64 ? [{ inlineData: { mimeType: "image/jpeg", data: brideImageBase64 } }] : []),
      ...(groomImageBase64 ? [{ inlineData: { mimeType: "image/jpeg", data: groomImageBase64 } }] : []),
    ],
  },
];
```

---

## 5. Step 4: "Save without generating" flow

Since your schema allows persisting design data with `generated_image`/`generated_invite_image_url` left null, the write path should be identical for both modes minus the actual Gemini call:

```typescript
async function saveInviteCardDraft(input: SaveDraftInput) {
  return db.aIEventInviteCard.upsert({
    where: { event_id: input.eventId },
    create: { event_id: input.eventId, ...input.designFields },
    update: { ...input.designFields, updated_at: new Date() },
  });
}
```

Because of the `@@unique([event_id])` constraint, each event has exactly one invite-card record — treat every save/generate call as an **upsert**, not a create, so users can revise their design parameters before finally generating, without your API needing separate "create draft" vs. "update draft" endpoints.

A `status` field isn't in your current schema but is worth adding:
```prisma
enum InviteCardStatus {
  DRAFT
  GENERATING
  GENERATED
  FAILED
}
```
This lets your frontend show "Design saved — generate anytime" vs. a spinner vs. an error state, and gives you a place to record failures for retry without overloading `generated_image` (null) to mean both "not yet generated" and "generation failed."

---

## 6. Step 5: The text-overlay step (the part that makes this production-safe)

After the AI returns the decorative artwork (with the text-safe zone left clean), overlay the real event data programmatically. Rough shape using `sharp` + SVG (Node):

```typescript
import sharp from "sharp";

async function overlayInvitationText(
  aiGeneratedImageBuffer: Buffer,
  eventData: InvitationEventData,
  layout: TextOverlayLayout, // derived from text_alignment, negative_space, typography_pairing
): Promise<Buffer> {
  const svgText = `
    <svg width="${layout.width}" height="${layout.height}">
      <style>
        .title   { font-family: '${layout.headlineFont}'; font-size: ${layout.headlineSize}px; }
        .subtext { font-family: '${layout.bodyFont}'; font-size: ${layout.bodySize}px; }
      </style>
      <text x="${layout.namesX}" y="${layout.namesY}" class="title" text-anchor="${layout.textAnchor}">
        ${escapeXml(eventData.brideName)} &amp; ${escapeXml(eventData.groomName)}
      </text>
      <text x="${layout.dateX}" y="${layout.dateY}" class="subtext" text-anchor="${layout.textAnchor}">
        ${escapeXml(eventData.eventDateDisplay)} · ${escapeXml(eventData.eventTimeDisplay)}
      </text>
      <text x="${layout.venueX}" y="${layout.venueY}" class="subtext" text-anchor="${layout.textAnchor}">
        ${escapeXml(eventData.venueName)}
      </text>
      <text x="${layout.addressX}" y="${layout.addressY}" class="subtext" text-anchor="${layout.textAnchor}">
        ${escapeXml(eventData.venueFullAddress)}
      </text>
    </svg>
  `;

  return sharp(aiGeneratedImageBuffer)
    .composite([{ input: Buffer.from(svgText), top: 0, left: 0 }])
    .toBuffer();
}
```

`escapeXml` is not optional — names and addresses are user/DB-sourced strings that can contain characters (`&`, `<`, apostrophes in names like `O'Brien`) that break SVG if not escaped.

`TextOverlayLayout` should be a set of coordinate presets keyed by `text_alignment` (centered / left-aligned / asymmetric) and `negative_space` (compact / generous), so the overlay always lands inside the zone the AI was instructed to leave clear. Building 4-6 layout presets covering your `design_preset` options is more reliable than computing text positions dynamically from image analysis.

---

## 7. Step 6: Safety, sanitization, and correctness checks

- **`additional_details` and `custom_message` are free text — sanitize before use.** Same rule as the illustration spec: strip anything resembling prompt-injection ("ignore previous instructions"), and never let free text override the text-safe-zone instruction or the identity-lock clause if a couple photo is present.
- **Reference image content moderation (EXAMPLE mode):** since users upload arbitrary reference images, run the same upload validation you already have (`validateImageInput`) plus a basic check that it's plausibly an invitation/card image, not unrelated content.
- **Post-overlay verification, not post-AI-generation verification:** because names/dates/addresses are programmatically overlaid (Section 6), you don't need OCR verification against the DB the way you would if the AI were rendering the text itself — the overlay step is deterministic and pulls directly from `InvitationEventData`. This is the main correctness payoff of the hybrid architecture: you've moved the "must be exactly right" requirement out of the probabilistic model and into ordinary, testable code.
- **If you ever do let the AI render short decorative text directly** (monogram initials, a "Save the Date" headline) — treat that output as unverified and consider a lightweight OCR pass (e.g. Tesseract or a cloud OCR API) comparing the rendered characters against the expected 2-4 characters before showing it to the user, since even 94%-accuracy models can drop a character.

---

## 8. Suggested schema additions

Your current schema covers the design/content fields well. A few additions worth considering:

```prisma
model AIEventInviteCard {
  // ...existing fields...

  status              InviteCardStatus @default(DRAFT)
  text_layout_preset  String?          // maps to a TextOverlayLayout preset (Section 6)
  generation_error     String?          // last error message, for FAILED status / retry UX
  regeneration_count   Int      @default(0) // track regenerate button usage per record, for rate limiting
}

enum InviteCardStatus {
  DRAFT
  GENERATING
  GENERATED
  FAILED
}
```

`generation_mode` you already have as an enum (`MANUAL` / `EXAMPLE`) — worth double-checking its default. Your schema shows `@default(EXAMPLE)`; given MANUAL is the more common/expected entry point for a design-parameters-first flow, confirm that default is intentional rather than a copy-paste artifact from modeling EXAMPLE first.

---

### Summary of what to build
1. A DB-resolution step (`resolveInvitationEventData`) that turns `event_id` into structured event data — never trust client-supplied name/date/venue text directly.
2. Two prompt builders (MANUAL, EXAMPLE) that generate **decorative artwork only**, explicitly leaving a text-safe zone — not final guest-facing text.
3. A couple-photo block, reused from the illustration spec, included only when `bride_image`/`groom_image` are actually present.
4. A deterministic text-overlay step (Section 6) that stamps the real event data onto the AI-generated artwork — this is what makes the feature production-safe for factual accuracy.
5. Upsert-based save/draft flow keyed on `event_id`, plus a `status` field for draft/generating/generated/failed states.
6. Sanitization on all free-text fields, and an explicit "don't copy the reference's own text" instruction in EXAMPLE mode to avoid leaking a different couple's details.

Happy to go deeper on any piece next — the actual layout-preset coordinate system for Section 6, the full request-handler code tying MANUAL/EXAMPLE together, or the frontend flow for the "design now, generate later" save option.
