# AI invite card: reliable generation

Sub-project 1 of 4 in the AI invite card fine-tuning effort
(1 reliable generation → 2 text always correct → 3 better designs → 4 easier UX).

## Goal

Every generation either produces a finished card or fails with a clear, typed reason
the couple can act on. Transient Gemini problems recover on their own; retries never
redraw artwork that is still valid; a card is never marked COMPLETED without a final image.

## Decisions already made

- Gemini plan: paid Tier 1. Model stays `gemini-3-pro-image`, 9:16.
- No fallback model.
- Recovery approach: hybrid — short in-call retries plus BullMQ job-level retries that
  resume from a saved checkpoint.

## Out of scope

- Text verification / OCR and "edit text only" (sub-project 2).
- Resolution, typography and prompt quality (sub-project 3).
- Variations, history, presets (sub-project 4).
- Face detection / photo quality scoring, HEIC decoding, a metrics dashboard.

## Current problems (backend)

- `aiInviteCardExampleGenerationService` and `aiInviteCardManualGenerationService` in
  `src/services/aiInviteCardGeneration.service.ts` are near-duplicates.
- If stage 2 (typesetting) returns no image, the service returns the stage 1 key and the
  job is marked COMPLETED with a stale or missing `generated_invite_image_url`.
- `generateContentWithRetry` (`src/utils/geminiRetry.util.ts`) wraps all attempts in one
  30s timeout that never aborts the underlying requests, and only recognises 503/429.
  A billing 429 ("prepayment credits are depleted") is retried as a rate limit.
- `fetchImageAsGeminiPart` labels every image `image/jpeg` and sends it unrotated at full size.
- The queue uses `attempts: 1`; any failure is final and restarts from stage 1.
- Staleness is measured from `generation_started_at`, so a slow but healthy run can be
  retired as "timed out".
- The UI shows raw error text.

## 1. Pipeline and checkpoints

### Single pipeline

One function `runInviteCardPipeline(card, deps)` replaces the two generation services.
Only prompt building differs by `generation_mode` (`buildStage1ExamplePrompt` /
`buildStage1ManualPrompt`, `buildStage2TextPrompt` unchanged in this sub-project).

`deps` carries the Gemini client and the S3 upload function so the fake-Gemini check
(section 4) can inject stubs. Production passes the real ones.

1. **DESIGN** — build the stage 1 parts, call Gemini, upload to
   `ai-invite-cards/generated-images/invitation-design`, save `invite_design_image_url`
   and `design_fingerprint` together in one update.
2. **TYPESETTING** — load the saved artwork, build the stage 2 parts, call Gemini,
   upload to `ai-invite-cards/generated-images/final-invitation`, save
   `generated_invite_image_url`.
3. Mark COMPLETED only after step 2 saved an image. A response without an image is a
   `NO_IMAGE` error, never a success.

### Design fingerprint

`design_fingerprint = sha256(model id + stage 1 prompt text + ordered S3 keys of every
image part sent in stage 1)`.

Hashing the built stage 1 input (rather than a hand-picked list of columns) means any
change that would alter the artwork — a design field, the reference image, the couple
photo, placement, attire, illustration style, additional details, text alignment, or a
prompt builder change — produces a new fingerprint, while text-only fields
(`custom_message`, wedding/event details used only in stage 2, `typography_pairing`)
do not.

At the start of each job attempt: if `invite_design_image_url` is set and
`design_fingerprint` equals the fingerprint of the current settings, skip DESIGN and go
straight to TYPESETTING. This covers job retries after a typesetting failure, the
"Try again" button, and edits that only change text.

### Retries

- **In-call** (inside the Gemini helper): each request gets its own `AbortController`
  with a 120s limit. `OVERLOADED` errors (500/503, network reset) are retried up to 2
  more times, waiting 2s then 6s (±20% jitter). All other categories are thrown
  immediately.
- **Job level** (BullMQ): `attempts: 3`, custom backoff 30s then 90s. When a stage
  throws a retryable category the job rethrows, so BullMQ schedules the next attempt,
  which resumes via the checkpoint. Non-retryable categories are rethrown as
  `UnrecoverableError` so BullMQ stops immediately. Update the queue comment that
  justified `attempts: 1`.

### Data model (`AIEventInviteCard`)

New nullable columns, one migration (`YYYYMMDDHHMMSS_add_generation_reliability_fields`):

| Column | Type | Purpose |
|---|---|---|
| `design_fingerprint` | `String?` | Fingerprint of the inputs that produced `invite_design_image_url` |
| `generation_error_code` | `String?` | Category from section 2; cleared when a new run starts |
| `generation_attempt` | `Int?` | Current job attempt (1-based) |
| `generation_heartbeat_at` | `DateTime? @db.Timestamptz(6)` | Last sign of life from the worker |

None of these hold S3 keys, so `isObjectKeyReferencedByUser` needs no change.

### Status lifecycle

- `generateAIInviteCardService`: persists settings, sets QUEUED, attempt 1, clears
  `generation_error` / `generation_error_code`, sets heartbeat, enqueues.
- Worker start of attempt N: PROCESSING, `generation_attempt = N`, heartbeat.
- Every stage start and every in-call retry: heartbeat update (and `generation_stage`).
- Retryable failure with attempts left: status back to QUEUED, stage null, keep
  `generation_error_code` so the UI can show "Retrying (N of 3)", heartbeat.
- Final failure (non-retryable, or last attempt): FAILED, error code, raw message in
  `generation_error`, `generation_completed_at`.
- Success: COMPLETED, error fields cleared, `generation_completed_at`.

### Staleness

`isGenerationStale` uses `generation_heartbeat_at ?? generation_started_at` against the
existing `GENERATION_STALE_AFTER_MS` (10 min). The longest silent gap in a healthy run is
one Gemini request (120s) plus a backoff (90s), well inside the window. Retiring a stale
card sets FAILED with `generation_error_code = TIMEOUT`.

## 2. Error categories and user-facing messages

The Gemini helper (replacing `geminiRetry.util.ts`) returns
`{ data: Buffer, mimeType: string }` or throws
`GeminiGenerationError { code, retryable, message, cause }`.

| Code | Detected by | Retry | Message shown |
|---|---|---|---|
| `OVERLOADED` | HTTP 500/503, network error (ECONNRESET, fetch failed) | in-call + job | "The AI service is busy. Retrying automatically…" |
| `RATE_LIMITED` | 429 / `RESOURCE_EXHAUSTED` not matching billing | job | same as above |
| `TIMEOUT` | our AbortController fired; stale retirement | job | same as above |
| `NO_IMAGE` | finishReason `NO_IMAGE` / `IMAGE_OTHER`, or no inline image part | job | same as above |
| `SAFETY_BLOCKED` | finishReason `IMAGE_SAFETY` / `IMAGE_PROHIBITED_CONTENT`, or `promptFeedback.blockReason` | no | "The AI's safety filter blocked this design. Try a different photo or simplify the extra details." |
| `BILLING` | 429 / `RESOURCE_EXHAUSTED` whose message mentions credits, billing or quota | no | "Invite generation is unavailable right now. Please try again later." |
| `INVALID_INPUT` | HTTP 400, image that cannot be downloaded or decoded, missing settings/wedding | no | "One of your uploaded images couldn't be read. Upload it again as a JPG or PNG." |
| `UNKNOWN` | anything else | job | "Something went wrong while creating your invite." |

"Retrying automatically…" messages apply while status is QUEUED/PROCESSING; once a job
has given up with a retryable code, the UI shows "Something went wrong while creating
your invite." with Try again.

Classification is a pure function `classifyGeminiError(errorOrResponse)` so it can be
checked without network calls. `BILLING` is logged at error level.

### Status endpoint

`GET /api/ai-invite-card/:id/generation-status` adds `error_code`, `attempt`, and
`max_attempts` (constant 3). `error` stays in the response for debugging but the
frontend stops displaying it. Update the OpenAPI route table if the response is described
there and regenerate.

### Frontend

- `DesignPreviewCard.tsx` maps `error_code` to the messages above (one lookup object).
- While QUEUED/PROCESSING with `attempt > 1`, show "Retrying (attempt of max_attempts)".
- On FAILED show **Try again** for every code except `BILLING`. For `SAFETY_BLOCKED` and
  `INVALID_INPUT` also point the couple at the photo / details fields.
- Try again calls the existing generate mutation with the current saved form values;
  the backend checkpoint decides whether to redraw.
- Types in the AI invite card model gain `error_code`, `attempt`, `max_attempts`.

## 3. Preparing uploaded photos

Uploads go browser → S3 directly, so normalisation happens in the worker when
`fetchImageAsGeminiPart` downloads each image. Originals in S3 are not modified.

Worker (new dependency `sharp`; base image `node:22-slim` is glibc, covered by sharp's
prebuilt binaries):

1. Download with a 30s timeout and 20 MB limit.
2. `sharp(buf).rotate()` to apply EXIF orientation.
3. Resize to fit inside 2048×2048, never enlarge.
4. Encode JPEG quality 90, or PNG when the image has an alpha channel; the Gemini part
   uses the matching mime type.
5. Download or decode failure → `INVALID_INPUT`.

HEIC is not decoded (not in sharp's prebuilt libvips); iOS Safari converts HEIC to JPEG
on file-input upload, and anything that slips through fails as `INVALID_INPUT`.

Frontend (`CharacterPhotoForm.tsx`, `ReferenceUploadForm.tsx`):
`accept="image/jpeg,image/png,image/webp"` and an inline error for files over 20 MB
before uploading.

## 4. Logging and testing

### Logging

A pino child logger per job with `cardId`, `jobId`, `attempt`:

- `generation.start` — mode, `design_reused`.
- `generation.stage` — `stage`, `duration_ms`, `outcome` (`ok`/`error`), `error_code`,
  output bytes.
- `generation.retry` — `error_code`, `wait_ms` (in-call retries).
- `generation.end` — final status, total `duration_ms`, attempts used.

### Checks

The backend has no test runner.

1. **Self-check** `src/utils/aiInviteCardGeneration.check.ts` (run with `npx tsx`,
   `node:assert` only):
   - `classifyGeminiError` on a 503, a billing 429, a plain 429, an abort, `IMAGE_SAFETY`,
     a text-only response, and a 400.
   - Fingerprint unchanged when only `custom_message` changes, changed when a design
     field, reference image or couple photo key changes.
   - Retry decision per code matches the table.
2. **Fake-Gemini run** (scratch script against the local DB, stubbed Gemini client and
   S3 upload): 503 then success; timeout; safety block; design ok + typesetting fails then
   retry skips DESIGN; typesetting returns no image and is not COMPLETED. Assert final
   status, `generation_error_code`, `generation_attempt`, and which keys were uploaded.
   Restore the card afterwards.
3. **Real end-to-end** after Gemini credits are topped up: one MANUAL and one EXAMPLE
   card, then change only the custom message and confirm `design_reused: true` in the log.

Also: `npx tsc --noEmit` (backend), `npm run build` and eslint on touched files (frontend).

## Files touched (expected)

Backend
- `prisma/schema.prisma` + new migration
- `src/services/aiInviteCardGeneration.service.ts` (single pipeline)
- `src/services/aiInviteCard.service.ts` (lifecycle, staleness, status response)
- `src/utils/geminiRetry.util.ts` → Gemini helper with classification
- `src/utils/aiInviteCardPromptBuilder.util.ts` (`fetchImageAsGeminiPart` normalisation)
- `src/utils/aiInviteCardGeneration.check.ts` (new)
- `src/queues/aiInviteCard.queue.ts`, `src/workers/aiInviteCard*.ts`
- `package.json` (`sharp`)
- `CLAUDE.md` (background jobs / AI card notes), OpenAPI table if affected

Frontend
- `src/components/DesignPreviewCard.tsx`, `AICardInviteMain.tsx`
- `src/components/CharacterPhotoForm.tsx`, `ReferenceUploadForm.tsx`
- AI invite card model types
