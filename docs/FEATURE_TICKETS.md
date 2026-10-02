# Backend Feature Tickets

Actionable tickets for the already-built API (Express + Prisma + BullMQ), written on 2026-10-01 from evidence in the code: `ponytail:` comments, dead code, leftover `console.log`s, missing infrastructure, frontend/backend drift, and the last ~60 commits. The frontend counterpart list lives in [`../../ai-wedding-rsvp-generator-frontend/docs/FEATURE_TICKETS.md`](../../ai-wedding-rsvp-generator-frontend/docs/FEATURE_TICKETS.md) (IDs `FE-xxx`).

## How to use this list

- Pick one ticket per session. Each one is meant to be independently actionable; read its Context links first, then do the Scope, then tick the Acceptance criteria.
- Follow the repo conventions in [`../CLAUDE.md`](../CLAUDE.md) (routes → controller → service → repository, ownership checks in services, `ApiError`, update the OpenAPI route table in `scripts/generate-openapi.ts` and run `npm run docs:openapi` whenever a route changes).
- Verify with `npx tsc --noEmit` (and `npm run build`). Until BE-031 lands there is no test runner; leave one assert-based check behind for non-trivial logic, as `src/utils/*.check.ts` already do.
- "Enhancement (proposed)" means the code clearly points at the extension (a ponytail upgrade path, a spec roadmap, a "being built" landing section) but it still needs a product decision before building.
- Line links point at the code as of commit `b8bd1a0`; line numbers drift, so search for the quoted symbol if a link is off.

**Priority:** P0 = bug or security issue to fix now · P1 = important · P2 = nice-to-have.
**Size:** S = up to half a day · M = up to 2 days · L = more than 2 days.
**IDs:** `BE-` for this repo, `FE-` for the frontend repo. "Depends on" lists tickets that should land first (or together, for cross-repo pairs).

## Summary

| ID | Title | Type | Priority | Size | Depends on |
|---|---|---|---|---|---|
| BE-001 | Restore rate limiting on credential and email endpoints | Security | P0 | S | - |
| BE-002 | Only send a verification email on sign-in after the password matches | Security | P1 | S | BE-001 |
| BE-003 | Fix forgot-password 500 for unknown emails | Bug | P1 | S | - |
| BE-004 | Return 401, not 500, for invalid or expired tokens | Bug | P1 | S | - |
| BE-005 | Per-session refresh tokens instead of one session per user | Security | P1 | M | BE-004, FE-001 |
| BE-006 | Revoke sessions after a password reset | Security | P1 | S | - |
| BE-007 | Remove `console.log` of profile payloads | Security | P1 | S | - |
| BE-008 | Reject non-template guest import files synchronously | Bug | P2 | S | FE-004 |
| BE-009 | Guest import job retention and temp-file cleanup | Tech debt | P2 | S | - |
| BE-010 | Guest validation parity: email format and accommodation address | Bug | P2 | S | FE-006 |
| BE-011 | Cap and coerce pagination `limit`/`page` | Security | P2 | S | - |
| BE-012 | Guest export as a background job on the guest queue | Enhancement (proposed) | P2 | M | FE-007 |
| BE-013 | Make `updated_at` update automatically (`@updatedAt`) | Tech debt | P2 | S | - |
| BE-014 | Remove or document GET endpoints the frontend never calls | Tech debt | P2 | S | - |
| BE-015 | Per-wedding timezone for deadlines, messages and the dashboard | Enhancement (proposed) | P2 | M | FE-009 |
| BE-016 | Sign view URLs with the GET expiry and return `expires_at` | Bug | P1 | S | FE-011 |
| BE-017 | Move header image generation onto the shared Gemini helper | Tech debt | P2 | M | - |
| BE-018 | Retire stale invite card generations from the worker, not only on poll | Bug | P2 | S | - |
| BE-019 | Delete dead AI code (`faceSwap.service.ts` and friends) | Tech debt | P2 | S | BE-017 (for `retry.util.ts`) |
| BE-020 | Decode HEIC source photos | Enhancement (proposed) | P2 | S | - |
| BE-021 | Verify the typeset text on generated invite cards | Enhancement (proposed) | P2 | M | - |
| BE-022 | Keep invite card version history | Enhancement (proposed) | P2 | M | FE-016 |
| BE-023 | Serve AI credit costs from the API | Tech debt | P2 | S | FE-015 |
| BE-024 | Credit ledger and an admin way to grant credits | Enhancement (proposed) | P2 | M | - |
| BE-025 | Enforce plan entitlements (free-tier limits) | Enhancement (proposed) | P2 | M | BE-024, FE-022 |
| BE-026 | Undo "mark sent" / "mark reminded" | Enhancement | P2 | S | FE-017 |
| BE-027 | WhatsApp Business Cloud API sending with delivery status | Enhancement (proposed) | P2 | L | BE-026 |
| BE-028 | Size the global rate limiter for polling and SSE reconnects | Bug | P1 | S | FE-014 |
| BE-029 | QR code check-in: data model and endpoint | Enhancement (proposed) | P2 | M | FE-020 |
| BE-030 | CI: type-check, build, Prisma validate, OpenAPI drift | Infra | P1 | S | - |
| BE-031 | Add `npm test` and unit checks for pure utils | Infra | P2 | S | - |
| BE-032 | Production logging: level from env, JSON output, no unbounded file | Infra | P2 | S | - |
| BE-033 | Error monitoring for the API and the worker | Infra | P2 | M | BE-032 |
| BE-034 | `/health` checks PostgreSQL and Redis | Infra | P2 | S | - |
| BE-035 | Deployment: persistent Redis and migrations on start | Infra | P2 | M | - |
| BE-036 | Export a typed `env` and stop reading `process.env` inline | Tech debt | P2 | M | BE-016 |
| BE-037 | Enable `strictNullChecks` | Tech debt | P2 | M | - |
| BE-038 | Fix CLAUDE.md and README drift | Tech debt | P2 | S | - |
| BE-039 | Stop returning the password hash from `PATCH /auth/me` | Security | P0 | S | - |
| BE-040 | Check ownership of `profilePicture` before saving it | Security | P0 | S | - |

Totals: 40 tickets. P0: 3 · P1: 9 · P2: 28.

---

## Auth

### BE-001 Restore rate limiting on credential and email endpoints

**Type:** Security · **Priority:** P0 · **Size:** S · **Depends on:** -

**Context**
- Commit `8e41fd7` ("remove auth rate limiter") deleted `authLimiter` and changed the mount to [`src/index.ts:55`](../src/index.ts#L55) `app.use("/api/auth", authRouter)`. It had been applied to the whole `/api/auth` router at 10 requests / 15 min, which also throttled `POST /auth/access-token` and `GET /auth/me` (the frontend calls both on every page load), which is the likely reason it was removed.
- Now `signin`, `signup`, `forgot-password`, `resend-verify-email`, `reset-password` and `verify-email` are only covered by `globalLimiter` (100 / 15 min per IP, [`rateLimiter.middleware.ts:24`](../src/middlewares/rateLimiter.middleware.ts#L24)): password guessing and email-sending endpoints (SES/SMTP cost and sender reputation) are effectively open.
- [`CLAUDE.md:45`](../CLAUDE.md#L45) still documents `authLimiter`.

**Scope**
- Re-add `authLimiter` in [`src/middlewares/rateLimiter.middleware.ts`](../src/middlewares/rateLimiter.middleware.ts) (same Redis store pattern, prefix `rl_auth:`).
- Apply it per route in [`src/routes/auth.routes.ts`](../src/routes/auth.routes.ts) to `signup`, `signin`, `verify-email`, `resend-verify-email`, `forgot-password`, `reset-password` only. Leave `access-token`, `logout`, `me` unthrottled beyond the global limiter.
- Consider a second key for `signin`/`forgot-password`/`resend-verify-email` on the submitted email (`keyGenerator`) so one address can't be hammered from many IPs.

**Acceptance criteria**
- [x] The 11th `POST /api/auth/signin` from one IP within 15 min returns 429 with the JSON `{ success: false, message }` shape.
- [x] `POST /api/auth/access-token` and `GET /api/auth/me` are not affected by `authLimiter` (reload the app 20 times without a 429).
- [x] `NODE_ENV=local` still skips the limiter, like the others.
- [x] OpenAPI summaries mention the limit; `npm run docs:openapi` regenerated.

**Notes/risks**
- Pairs with BE-002 (sign-in sending emails). Keep limits generous enough that a couple typing a wrong password a few times is not locked out for long.

### BE-002 Only send a verification email on sign-in after the password matches

**Type:** Security · **Priority:** P1 · **Size:** S · **Depends on:** BE-001

**Context**
- [`src/services/auth.service.ts:106-121`](../src/services/auth.service.ts#L106): for an unverified account, `signInService` generates a verify-email token and sends an email before checking the password, then returns 403 "Account verification is pending". Anyone who knows an unverified address can trigger unlimited emails to it and learns that the account exists.
- The same function returns 404 "Invalid email or password" for both unknown email and wrong password ([`auth.service.ts:104`](../src/services/auth.service.ts#L104), [`:126`](../src/services/auth.service.ts#L126)), which is otherwise good.

**Scope**
- In `signInService`, run `bcrypt.compare` first; only then branch on `is_email_verified`.
- Optionally reuse an unexpired EMAIL_VERIFICATION token or skip sending if one was sent in the last few minutes.
- Change the invalid-credentials status to 401 (keep the message); check the frontend login form still shows it (`useLogin` toasts `error.message`).

**Acceptance criteria**
- [x] Sign-in to an unverified account with a wrong password returns the generic invalid-credentials error and sends no email.
- [ ] Sign-in with the right password to an unverified account still returns 403 and sends the verification email.
- [x] Verified-account sign-in is unchanged.

**Notes/risks**
- Frontend relies on the 403 message text to show the verification notice; keep it unchanged.

### BE-003 Fix forgot-password 500 for unknown emails

**Type:** Bug · **Priority:** P1 · **Size:** S · **Depends on:** -

**Context**
- [`src/services/auth.service.ts:190-216`](../src/services/auth.service.ts#L190): the transaction callback does `if (!user) return;`, then the caller destructures `const { user, resetPasswordToken } = await prisma.$transaction(...)`, which throws a TypeError on `undefined`. Unknown emails get a 500 ("Something went wrong"), known emails get 200, so the endpoint both errors and reveals which emails have accounts.
- `resendVerificationEmailService` right above it handles the same case correctly by returning early.

**Scope**
- Return early (200, same message) when no user is found, before calling `sendEmail`.

**Acceptance criteria**
- [x] `POST /api/auth/forgot-password` with an unknown email returns 200 with the same message as a known email, and no error is logged.
- [ ] Known email still receives the reset link.

**Notes/risks**
- Signup still reveals registered emails ("already exists"); that is an accepted product trade-off, not part of this ticket.

### BE-004 Return 401, not 500, for invalid or expired tokens

**Type:** Bug · **Priority:** P1 · **Size:** S · **Depends on:** -

**Context**
- [`src/services/token.service.ts:124-150`](../src/services/token.service.ts#L124) throws plain `Error`s ("Invalid or expired token", "Token not found please login again", "Token has expired"). `authenticate`, `verifyEmailService` and `resetPasswordService` wrap them in `ApiError(401)`, but `refreshTokenService` ([`auth.service.ts:244-261`](../src/services/auth.service.ts#L244)) and `logoutService` ([`auth.service.ts:263-280`](../src/services/auth.service.ts#L263)) do not, so an expired refresh token becomes a 500 via [`error.middleware.ts`](../src/middlewares/error.middleware.ts).
- Frontend impact: sign-out with an expired refresh token fails with a 500 and the user stays signed in locally (see FE-002).

**Scope**
- Throw `ApiError(401, ...)` from `verifyTokenService` (or catch in `refreshTokenService`/`logoutService`).
- `logoutService`: treat an already-invalid refresh token as success (idempotent logout).

**Acceptance criteria**
- [x] `POST /api/auth/access-token` with a garbage or expired refresh token returns 401.
- [x] `POST /api/auth/logout` with an expired refresh token returns 200 (or 401), never 500.
- [x] No "Something went wrong" 500 in `logs/app.log` for these cases.

**Notes/risks**
- Keep error messages generic.

### BE-005 Per-session refresh tokens instead of one session per user

**Type:** Security · **Priority:** P1 · **Size:** M · **Depends on:** BE-004, FE-001

**Context**
- `signInService` ([`auth.service.ts:128`](../src/services/auth.service.ts#L128)) and `refreshTokenService` ([`auth.service.ts:256`](../src/services/auth.service.ts#L256)) call `deleteTokensByUserIdService`, which deletes every token row for the user regardless of type ([`token.repository.ts:27-34`](../src/repositories/token.repository.ts#L27)).
- Effects: signing in on a phone ends the laptop session at its next refresh; bride and groom sharing one account keep logging each other out; a pending email-verification or password-reset link is invalidated by any sign-in or refresh; two tabs refreshing at once race and one loses.

**Scope**
- On refresh, delete only the used refresh token (by `jti`) and create a new pair. Link access and refresh tokens to a session if needed (e.g. a `session_id`/`family` column) so logout can delete just that pair.
- On sign-in, create a new pair without deleting other sessions.
- Logout deletes only the current session's tokens.
- Optional: refresh-token reuse detection (a reused, already-rotated token revokes that family).
- Add a nightly or on-sign-in cleanup of expired Token rows (they will now accumulate).

**Acceptance criteria**
- [ ] Two browsers signed into the same account both keep working past several access-token expiries.
- [ ] Logging out in one browser does not log out the other.
- [ ] A reset-password link generated before a sign-in still works after it.
- [ ] Using a refresh token twice returns 401 the second time.

**Notes/risks**
- Needs a migration if a session column is added. Land FE-001 first; the frontend currently cannot survive a mid-session refresh at all.

### BE-006 Revoke sessions after a password reset

**Type:** Security · **Priority:** P1 · **Size:** S · **Depends on:** -

**Context**
- [`resetPasswordService`, `auth.service.ts:218-242`](../src/services/auth.service.ts#L218) updates the password and deletes only the reset token. Existing access and refresh tokens (for up to `JWT_REFRESH_EXPIRATION_DAYS=30`) stay valid, so a reset does not lock out someone who had the old password.

**Scope**
- Inside the same transaction, delete the user's ACCESS and REFRESH tokens (not only by jti).

**Acceptance criteria**
- [x] After a password reset, a previously valid refresh token returns 401 on `POST /auth/access-token`.
- [x] The user can sign in with the new password.

**Notes/risks**
- If BE-005 introduces sessions, delete all sessions for the user here.

### BE-007 Remove `console.log` of profile payloads

**Type:** Security · **Priority:** P1 · **Size:** S · **Depends on:** -

**Context**
- [`src/controllers/auth.controller.ts:135`](../src/controllers/auth.controller.ts#L135) `console.log(body)` and [`src/services/auth.service.ts:303`](../src/services/auth.service.ts#L303) `console.log(payload)` print names, mobile numbers and profile picture keys to stdout on every profile update, bypassing pino.

**Scope**
- Delete both lines. Grep `src/` for other `console.` uses outside `config/env.ts` (startup) and `*.check.ts` (scripts).

**Acceptance criteria**
- [x] `PATCH /api/auth/me` produces no raw console output.
- [x] `grep -rn "console\." src` only matches `config/env.ts` and `*.check.ts`.

**Notes/risks**
- None.

### BE-039 Stop returning the password hash from `PATCH /auth/me`

**Type:** Security · **Priority:** P0 · **Size:** S · **Depends on:** -

**Context**
- [`src/repositories/user.repository.ts:31-42`](../src/repositories/user.repository.ts#L31-L42) `updateUserById` returns the full Prisma `User` row, and [`src/controllers/auth.controller.ts:144-146`](../src/controllers/auth.controller.ts#L144-L146) passes it straight to `sendSuccess`. The response therefore includes the bcrypt `password` hash. `GET /auth/me` already excludes it with a `select`. Finding B16 in [`SECURITY_AND_ACCESS.md`](SECURITY_AND_ACCESS.md).

**Scope**
- Return the same field list as `GET /auth/me` from the profile update (add a `select`, or re-read the user through the existing profile query).

**Acceptance criteria**
- [x] The `PATCH /api/auth/me` response has no `password` key.
- [x] Its `data` shape matches `GET /api/auth/me`.

**Notes/risks**
- The frontend writes this response into `userAtom` (localStorage), so existing browsers may hold a stored hash until the next profile fetch overwrites it.

### BE-040 Check ownership of `profilePicture` before saving it

**Type:** Security · **Priority:** P0 · **Size:** S · **Depends on:** -

**Context**
- [`src/services/auth.service.ts:290-307`](../src/services/auth.service.ts#L290-L307) `updateProfileService` saves any string as `profile_picture`. [`src/repositories/general.repository.ts:12`](../src/repositories/general.repository.ts#L12) then treats that column as proof the caller owns the key, so `POST /api/general/generate-view-url` signs a GET URL for it. A host who knows or guesses another user's S3 key can read that file. Finding B1 in [`SECURITY_AND_ACCESS.md`](SECURITY_AND_ACCESS.md).

**Scope**
- Run the same `assertOwnedImageKeys` check the invite card and page-setting writes use before saving `profile_picture`.

**Acceptance criteria**
- [x] Saving a `profilePicture` key outside `users/<callerId>/` that no record of the caller references is rejected.
- [x] Saving a key the caller just uploaded still works, and so does clearing the picture with `null`.

**Notes/risks**
- Check existing rows for keys outside the owner's prefix before relying on the column again.

## Guests

### BE-008 Reject non-template guest import files synchronously

**Type:** Bug · **Priority:** P2 · **Size:** S · **Depends on:** FE-004

**Context**
- [`upload.middleware.ts`](../src/middlewares/upload.middleware.ts) has a 5 MB limit but no `fileFilter`; [`guest.controller.ts:161-172`](../src/controllers/guest.controller.ts#L161) queues any file. Only the worker finds out it is not an `.xlsx` with the template's `_meta` sheet ([`guest.service.ts:628-676`](../src/services/guest.service.ts#L628)), so the user waits on polling to learn "Invalid template file".
- `read-excel-file` reads `.xlsx` only; the frontend picker also offers `.xls` (FE-004), and the landing page promises CSV (FE-021).

**Scope**
- Add a `fileFilter` (xlsx mime type / extension) and, in the service, a cheap synchronous check that the `_meta` sheet exists and `weddingId` matches before enqueueing. Return 400 with the same messages the worker uses today.
- Verify the wedding belongs to the caller before enqueueing (today only per-row event checks enforce ownership).

**Acceptance criteria**
- [ ] Uploading a `.csv`, `.xls`, a random `.xlsx`, or another wedding's template returns 400 immediately, with no job queued.
- [ ] A valid template still returns 202 with a `jobId`.
- [ ] Uploading to a wedding the caller does not own returns 404.

**Notes/risks**
- Keep the worker-side checks; they protect against races.

### BE-009 Guest import job retention and temp-file cleanup

**Type:** Tech debt · **Priority:** P2 · **Size:** S · **Depends on:** -

**Context**
- [`src/queues/guest.queue.ts:30-31`](../src/queues/guest.queue.ts#L30): `removeOnComplete: false`, `removeOnFail: false`, so every import stays in Redis forever (the invite card queue already uses `{ age, count }`, [`inviteCard.queue.ts`](../src/queues/inviteCard.queue.ts)).
- [`guest.worker.ts:21-27`](../src/workers/guest.worker.ts#L21) deletes the temp file only on success; failed jobs leave `guest-import-*.xlsx` in `os.tmpdir()`.
- [`guest.service.ts:604-608`](../src/services/guest.service.ts#L604) writes the upload to the API's tmp dir and passes the path to the worker, which only works while both run in one container ([`start.sh`](../start.sh)).

**Scope**
- Use `removeOnComplete: { age: 24h, count: N }` and the same for fail (long enough for the frontend's 5-minute poll).
- Unlink the temp file in a `finally`.
- Note (not required here): moving the upload to S3 or passing the buffer in the job payload removes the shared-filesystem assumption.

**Acceptance criteria**
- [ ] A failed import leaves no file in the tmp dir.
- [ ] Old import jobs disappear from Redis after the retention window; `GET /guest/import-status/:jobId` still works within it.

**Notes/risks**
- After retention, the status endpoint returns 404 for old job ids; the frontend only polls for 5 minutes, so that is fine.

### BE-010 Guest validation parity: email format and accommodation address

**Type:** Bug · **Priority:** P2 · **Size:** S · **Depends on:** FE-006

**Context**
- [`guest.validations.ts:79-85`](../src/validations/guest.validations.ts#L79): `email` is any trimmed string up to 50 chars, so the API and Excel import accept `not-an-email` while the frontend form rejects it ([`../../ai-wedding-rsvp-generator-frontend/src/validations/guest.validation.ts`](../../ai-wedding-rsvp-generator-frontend/src/validations/guest.validation.ts)).
- The frontend requires `accomodation_address` when `accomodation_required` is true; the backend does not ([`guest.validations.ts:93-98`](../src/validations/guest.validations.ts#L93)), so imports can create "needs accommodation" guests with no address.

**Scope**
- Blank email still becomes `null`; a non-blank email must pass `z.email()`.
- Add a `superRefine` requiring an address when accommodation is required (for create; for the partial edit schema only when both fields are present).
- Regenerate OpenAPI.

**Acceptance criteria**
- [ ] `POST /api/guest` with `email: "abc"` returns 400; with `email: ""` stores `null`.
- [ ] Import rows with an invalid email or missing address are reported per row in the job result, not silently saved.

**Notes/risks**
- Existing rows with bad emails stay; no data migration.

### BE-011 Cap and coerce pagination `limit`/`page`

**Type:** Security · **Priority:** P2 · **Size:** S · **Depends on:** -

**Context**
- `limit` is `z.string()` with no maximum in [`guest.validations.ts:12`](../src/validations/guest.validations.ts#L12), [`wedding.validation.ts:5`](../src/validations/wedding.validation.ts#L5), [`event.validations.ts:11`](../src/validations/event.validations.ts#L11); controllers `parseInt` it ([`guest.controller.ts:40-41`](../src/controllers/guest.controller.ts#L40)). `?limit=1000000` loads every row with relations. Invite card and page-setting lists already use `z.coerce.number().min(1).max(50)` ([`inviteCard.validation.ts:24`](../src/validations/inviteCard.validation.ts#L24)).

**Scope**
- Switch to `z.coerce.number().int().min(1).max(100).default(10)` (and `page` min 1), drop the `parseInt` in controllers.

**Acceptance criteria**
- [ ] `GET /api/guest?weddingId=...&limit=5000` returns 400.
- [ ] Default and existing frontend page sizes still work.

**Notes/risks**
- `exportGuestsService` passes 999999 directly to the repository, not through the schema; leave it.

### BE-012 Guest export as a background job on the guest queue

**Type:** Enhancement (proposed) · **Priority:** P2 · **Size:** M · **Depends on:** FE-007

**Context**
- The guest queue payload is a discriminated union "so more job kinds can share the queue" ([`CLAUDE.md:33`](../CLAUDE.md#L33), [`guest.queue.ts:10-19`](../src/queues/guest.queue.ts#L10)), but only `parse-excel` exists.
- `exportGuestsService` builds the whole workbook inside the request with `limit` 999999 ([`guest.service.ts:856`](../src/services/guest.service.ts#L856)).

**Scope**
- Add `type: "export-excel"` to the union, a service that writes the workbook to S3 under the user's prefix, and return `{ object_key }` as the job result. `GET /guest/import-status/:jobId` (keeps the `userId` check) reports it.
- Keep the synchronous endpoint for small lists or switch over completely; decide in the ticket.

**Acceptance criteria**
- [ ] Export of 2,000 guests returns 202 quickly and the job result contains a key viewable via `generate-view-url`.
- [ ] Another user's `jobId` returns 404.

**Notes/risks**
- Only worth it if exports get slow; measure first.

## Events and weddings

### BE-013 Make `updated_at` update automatically (`@updatedAt`)

**Type:** Tech debt · **Priority:** P2 · **Size:** S · **Depends on:** -

**Context**
- Every model declares `updated_at DateTime @default(now())` without `@updatedAt` ([`prisma/schema.prisma:96`](../prisma/schema.prisma#L96) and the other models). Some repositories set it by hand (`wedding.repository.ts:162`, `event.repository.ts:113`), others do not (user profile update via `updateUserById`, guest update).
- The profile page shows "Last updated" from `user.updated_at` ([`../../ai-wedding-rsvp-generator-frontend/src/pages/ViewProfile.tsx:449-450`](../../ai-wedding-rsvp-generator-frontend/src/pages/ViewProfile.tsx#L449)), which never changes, and the frontend refreshes its cached active wedding by comparing `updated_at` ([`AppLayout.tsx:60-63`](../../ai-wedding-rsvp-generator-frontend/src/layout/AppLayout.tsx#L60)).

**Scope**
- Add `@updatedAt` to every `updated_at` field, run `npx prisma migrate dev` (likely an empty/no-op SQL migration; keep the explaining comment) and `npx prisma generate`, then remove the manual `updated_at: new Date()` writes.

**Acceptance criteria**
- [ ] Updating a profile, guest, event, wedding, page setting and invite card each changes `updated_at`.
- [ ] `npx tsc --noEmit` passes.

**Notes/risks**
- `updateMany` also sets `@updatedAt` fields in Prisma; check the credit decrement (`spendCredits`) is fine with that.

### BE-014 Remove or document GET endpoints the frontend never calls

**Type:** Tech debt · **Priority:** P2 · **Size:** S · **Depends on:** -

**Context**
- No frontend service calls `GET /api/event/:id` ([`event.routes.ts:35`](../src/routes/event.routes.ts#L35)), `GET /api/page-setting/:id` or `GET /api/page-setting/event/:eventId` ([`eventInviteFormat.route.ts:29-42`](../src/routes/eventInviteFormat.route.ts#L29)); compare [`../../ai-wedding-rsvp-generator-frontend/src/api/event.service.ts`](../../ai-wedding-rsvp-generator-frontend/src/api/event.service.ts) and [`pageSetting.service.ts`](../../ai-wedding-rsvp-generator-frontend/src/api/pageSetting.service.ts).

**Scope**
- Decide per endpoint: delete (route, controller, service, validation, OpenAPI row) or keep as part of the documented API. Default: delete, since each one carries its own ownership check to maintain.

**Acceptance criteria**
- [ ] Every route in `src/routes` is either called by the frontend or intentionally kept with an OpenAPI summary saying why.
- [ ] `npm run docs:openapi` regenerated; route table and routes still match.

**Notes/risks**
- Check the self-checks and scripts do not use them.

### BE-015 Per-wedding timezone for deadlines, messages and the dashboard

**Type:** Enhancement (proposed) · **Priority:** P2 · **Size:** M · **Depends on:** FE-009

**Context**
- Three ponytails name the same limit: [`guest.service.ts:989`](../src/services/guest.service.ts#L989) (message dates formatted in UTC; far-west hosts may see the next day), [`wedding.service.ts:201`](../src/services/wedding.service.ts#L201) (dashboard 7-day window in the server's timezone). The server runs in one container ([`dockerfile`](../dockerfile)), so its timezone is arbitrary.

**Scope**
- Add `Wedding.timezone` (IANA name, default `Asia/Kolkata` to match `WHATSAPP_DEFAULT_COUNTRY_CODE=91`), accept it in create/edit validation.
- Use it in `formatMessageDate` and the dashboard `since`/`toDayKey` bucketing.

**Acceptance criteria**
- [ ] A wedding with `America/Los_Angeles` gets WhatsApp messages and dashboard day buckets in that timezone.
- [ ] Existing weddings keep today's output (default applied by migration).

**Notes/risks**
- Event dates are `@db.Date`; only formatting and bucketing change. Remove the ponytail comments once done.

## Page settings and RSVP

### BE-016 Sign view URLs with the GET expiry and return `expires_at`

**Type:** Bug · **Priority:** P1 · **Size:** S · **Depends on:** FE-011

**Context**
- [`general.service.ts:48`](../src/services/general.service.ts#L48) signs view (getObject) URLs with `AWS_BUCKET_PUT_URL_EXPIRE` (300 s in [`.env.example:23`](../.env.example#L23)); `AWS_BUCKET_GET_URL_EXPIRE=3600` ([`.env.example:24`](../.env.example#L24)) is never read and is missing from [`src/config/env.ts`](../src/config/env.ts). The RSVP page does the same on purpose ([`rsvp.service.ts:71-75`](../src/services/rsvp.service.ts#L71)).
- The frontend caches view URLs for exactly 5 minutes and its ponytail says it "assumes signed URLs live longer than 5 min" ([`../../ai-wedding-rsvp-generator-frontend/src/hooks/use-pageSetting.ts:131`](../../ai-wedding-rsvp-generator-frontend/src/hooks/use-pageSetting.ts#L131)); with a 300 s expiry, images can break at the boundary.

**Scope**
- Add `AWS_BUCKET_GET_URL_EXPIRE` to `env.ts`; use it in `generateS3PresignedViewUrlService` and `signForGuest`.
- Return `expires_at` (ISO) next to `url` from `generate-view-url`.

**Acceptance criteria**
- [ ] View URLs from `generate-view-url` and on the RSVP page are valid for `AWS_BUCKET_GET_URL_EXPIRE` seconds.
- [ ] Response includes `expires_at`; OpenAPI regenerated.
- [ ] Upload URLs still use the PUT expiry.

**Notes/risks**
- Frontend counterpart FE-011 uses `expires_at` for `staleTime`.

### BE-017 Move header image generation onto the shared Gemini helper

**Type:** Tech debt · **Priority:** P2 · **Size:** M · **Depends on:** -

**Context**
- The reliability work (spec `docs/superpowers/specs/2026-09-14-ai-invite-card-reliable-generation-design.md`, commit `57ec681`) covered invite cards only. The RSVP header image still uses the old path: [`geminiImageEditor.util.ts:18-99`](../src/utils/geminiImageEditor.util.ts#L18) calls `generateContent` through [`retry.util.ts`](../src/utils/retry.util.ts) (500/503 only, no per-call timeout, no billing/safety classification) inside the HTTP request ([`eventInviteFormat.service.ts:128-186`](../src/services/eventInviteFormat.service.ts#L128)).
- The source photo is sent as-is (no EXIF rotation, no size cap, trusted content type), unlike invite cards ([`imageNormalize.util.ts`](../src/utils/imageNormalize.util.ts)).
- `POST /page-setting/generate-image` has no `imageGenerationLimiter` ([`eventInviteFormat.route.ts:51-56`](../src/routes/eventInviteFormat.route.ts#L51)), unlike `POST /invite-card/generate-invite`.

**Scope**
- Give `generateImage` ([`geminiImage.util.ts:132`](../src/utils/geminiImage.util.ts#L132)) optional `model` and `aspectRatio` options (defaults unchanged) and call it for the header image (`gemini-3.1-flash-image`, `1:1`).
- Normalise the source with `normalizeImageForGemini`.
- Map `GeminiGenerationError` codes to user-facing `ApiError`s (e.g. `SAFETY_BLOCKED` → 422 with the spec's message, `BILLING` → 503), keeping the refund.
- Add `imageGenerationLimiter` to the route.

**Acceptance criteria**
- [ ] A header generation that Gemini safety-blocks returns a 4xx with a readable message and refunds 5 credits.
- [ ] A rotated phone photo produces an upright result.
- [ ] Request time is bounded (120 s per call plus in-call retries).
- [ ] `retry.util.ts` has no remaining imports (delete in BE-019).

**Notes/risks**
- Moving it to the queue is out of scope; keep it synchronous unless timeouts show up in production.

## AI invite cards

### BE-018 Retire stale invite card generations from the worker, not only on poll

**Type:** Bug · **Priority:** P2 · **Size:** S · **Depends on:** -

**Context**
- Stale QUEUED/PROCESSING cards are only failed and refunded inside `getInviteCardGenerationStatusService` ([`inviteCard.service.ts:312-327`](../src/services/inviteCard.service.ts#L312)). If the couple closes the tab and never reopens the page, the card stays "in flight" and the 10 credits stay charged.
- Redis runs inside the app container with no persistence ([`start.sh:4`](../start.sh#L4)), so a redeploy can drop queued jobs entirely.

**Scope**
- Add a BullMQ repeatable job (every few minutes) in the worker that finds cards in QUEUED/PROCESSING with a stale heartbeat and applies the same FAILED/TIMEOUT update plus `refundInviteCardCredits`. Extract the shared "retire" function so the status endpoint and the sweep use one code path.
- Register the repeatable job's worker in [`src/workers/index.ts`](../src/workers/index.ts).

**Acceptance criteria**
- [ ] A card forced into PROCESSING with a heartbeat 11 minutes old becomes FAILED with `TIMEOUT` and refunded within one sweep interval, with nobody polling.
- [ ] Refund happens once even if the status endpoint and the sweep race (the existing conditional `credits_charged` update covers this; verify).

**Notes/risks**
- Use `attempts: 1` for the sweep job.

### BE-019 Delete dead AI code (`faceSwap.service.ts` and friends)

**Type:** Tech debt · **Priority:** P2 · **Size:** S · **Depends on:** BE-017 (for `retry.util.ts`)

**Context**
- [`src/services/faceSwap.service.ts`](../src/services/faceSwap.service.ts) (95 lines) is imported nowhere; CLAUDE.md already says it is unused.
- [`inviteCardEditImageWithGemini`, `geminiImageEditor.util.ts:101`](../src/utils/geminiImageEditor.util.ts#L101) is exported but unused (a near copy of the header function above it).
- [`src/types/inviteCard.type.ts`](../src/types/inviteCard.type.ts) is an empty file.
- [`inviteCardPromptBuilder.util.ts:252`](../src/utils/inviteCardPromptBuilder.util.ts#L252) has an `import` in the middle of the file.

**Scope**
- Delete the file, the unused function, the empty type file; move the stray import to the top. After BE-017, delete `retry.util.ts` if unused.
- Update CLAUDE.md's mention of `faceSwap.service.ts`.

**Acceptance criteria**
- [ ] `npx tsc --noEmit` and `npm run build` pass.
- [ ] `npx tsx src/utils/inviteCardGeneration.check.ts` still passes.

**Notes/risks**
- None; git history keeps the face swap prompt if it is ever wanted.

### BE-020 Decode HEIC source photos

**Type:** Enhancement (proposed) · **Priority:** P2 · **Size:** S · **Depends on:** -

**Context**
- Ponytail at [`imageNormalize.util.ts:12`](../src/utils/imageNormalize.util.ts#L12): HEIC cannot be decoded by sharp's prebuilt libvips, so HEIC uploads fail as `INVALID_INPUT`. The spec listed HEIC as out of scope.

**Scope**
- Detect HEIC/HEIF by magic bytes and convert to JPEG with a pure-JS decoder (e.g. `heic-convert`) before sharp, or document that the frontend converts first. Pick the smaller change.

**Acceptance criteria**
- [ ] An iPhone `.heic` couple photo generates a card instead of failing with `INVALID_INPUT`.
- [ ] The self-check covers a HEIC fixture (or the decision to reject is documented and the frontend blocks HEIC in the picker).

**Notes/risks**
- Adds a dependency and CPU time in the worker; only do it if HEIC failures show up in `generation_error_code` stats.

### BE-021 Verify the typeset text on generated invite cards

**Type:** Enhancement (proposed) · **Priority:** P2 · **Size:** M · **Depends on:** -

**Context**
- The reliability spec is "sub-project 1 of 4"; sub-project 2 is "text always correct" (text verification/OCR), explicitly out of scope of what shipped. Today a card is COMPLETED as soon as TYPESETTING returns an image ([`CLAUDE.md:41`](../CLAUDE.md#L41)), even if names or dates are misspelled.

**Scope**
- After TYPESETTING, ask a Gemini text model to read the names, date and venue from the final image and compare them (normalised) to the expected strings; on mismatch retry TYPESETTING once (DESIGN is reused via the fingerprint), then complete with a `text_check` result stored on the card.
- Surface the result in the status response.

**Acceptance criteria**
- [ ] A pure function compares expected vs. read text and is covered by the self-check.
- [ ] A mismatch triggers at most one extra TYPESETTING call and never redraws DESIGN.
- [ ] Credits are charged once per generation, as today.

**Notes/risks**
- Extra Gemini cost per card; add a feature flag.

### BE-022 Keep invite card version history

**Type:** Enhancement (proposed) · **Priority:** P2 · **Size:** M · **Depends on:** FE-016

**Context**
- Spec sub-project 4 lists "variations, history, presets". `EventInviteCard` is one row per event (`@@unique([event_id])`, [`schema.prisma:278`](../prisma/schema.prisma#L278)) and each generation overwrites `generated_invite_image_url`, so a couple who liked the previous card cannot go back.

**Scope**
- New `EventInviteCardVersion` table (card id, image key, design fingerprint, created_at) written when a generation completes; endpoints to list versions and to restore one as the current image. Add the key column to `isObjectKeyReferencedByUser` ([`general.repository.ts`](../src/repositories/general.repository.ts)).

**Acceptance criteria**
- [ ] Two successful generations leave two versions; restoring the first makes the RSVP page show it.
- [ ] Only the owner can list or restore; view URLs work for version keys.

**Notes/risks**
- Decide a cap (e.g. last 10) to bound S3 usage.

### BE-023 Serve AI credit costs from the API

**Type:** Tech debt · **Priority:** P2 · **Size:** S · **Depends on:** FE-015

**Context**
- [`credits.service.ts:5-10`](../src/services/credits.service.ts#L5): `AI_CREDIT_COST` is "Mirrored in the frontend's src/constants/index.ts" ([`../../ai-wedding-rsvp-generator-frontend/src/constants/index.ts:36-40`](../../ai-wedding-rsvp-generator-frontend/src/constants/index.ts#L36)). Changing a price needs two deploys in sync.

**Scope**
- Include `ai_credit_costs` in `GET /api/auth/me` (already fetched for the balance) or a small public config endpoint.

**Acceptance criteria**
- [ ] `/auth/me` returns the balance and the costs; OpenAPI regenerated.

**Notes/risks**
- Keep the frontend constant as a fallback until FE-015 ships.

### BE-024 Credit ledger and an admin way to grant credits

**Type:** Enhancement (proposed) · **Priority:** P2 · **Size:** M · **Depends on:** -

**Context**
- Every user starts with 100 credits ([`migration 20260924100000_add_ai_credits`](../prisma/migrations/20260924100000_add_ai_credits/migration.sql)); `spendCredits`/`refundCredits` only mutate `User.ai_credits` ([`credits.service.ts`](../src/services/credits.service.ts)). There is no way to add credits and no record of why a balance changed, so support cannot answer "where did my credits go" or top someone up without SQL.

**Scope**
- `CreditTransaction` table (user, delta, reason: INVITE_CARD/HEADER_IMAGE/REFUND/GRANT, ref id, created_at) written in the same transaction as each balance change.
- A script (`scripts/grant-credits.ts <email> <amount> <note>`) for admins.

**Acceptance criteria**
- [ ] Every spend/refund writes one ledger row; the sum of rows plus the starting 100 equals the balance.
- [ ] `credits.check.ts` covers the ledger.
- [ ] The grant script adds credits and a GRANT row.

**Notes/risks**
- Prerequisite for any checkout (BE-025).

### BE-025 Enforce plan entitlements (free-tier limits)

**Type:** Enhancement (proposed) · **Priority:** P2 · **Size:** M · **Depends on:** BE-024, FE-022

**Context**
- The landing pricing lists a Free plan with "One wedding" and "Up to 50 guests", and paid plans with unlimited guests and AI cards ([`../../ai-wedding-rsvp-generator-frontend/src/components/landing/PricingSection.tsx:3-35`](../../ai-wedding-rsvp-generator-frontend/src/components/landing/PricingSection.tsx#L3)); its ponytail says "there is no billing in this codebase". Nothing on the backend enforces any limit.

**Scope**
- Product decision first: plans and limits. Then a `plan` on User (or per wedding), checks in `addNewWeddingService` and `addNewGuestService` (including Excel import rows) returning 402 with a clear message.

**Acceptance criteria**
- [ ] A free user's 51st guest (or second wedding) is rejected with 402 and a message the frontend can show.
- [ ] Paid users are not limited.

**Notes/risks**
- Checkout/payment provider integration is a separate, larger ticket once the plan model exists.

## Invites and reminders

### BE-026 Undo "mark sent" / "mark reminded"

**Type:** Enhancement · **Priority:** P2 · **Size:** S · **Depends on:** FE-017

**Context**
- Ponytail at [`guest.service.ts:1041`](../src/services/guest.service.ts#L1041): an invite is marked sent when the couple opens the `wa.me` link; WhatsApp cannot confirm they pressed Send. A mis-click marks it sent forever, delays the first reminder (timed from `invite_sent_at`, [`reminder.util.ts`](../src/utils/reminder.util.ts)) and hides the guest from the "not sent" filter.

**Scope**
- `DELETE /api/guest/invites/:inviteId/mark-sent` and `DELETE .../mark-reminded?reminder=FIRST|FINAL` (ownership-checked like the POSTs) clearing the timestamps. Add OpenAPI rows.

**Acceptance criteria**
- [ ] After undo, the invite appears again in `GET /invites/whatsapp` as unsent and in the `inviteSent=not_sent` guest filter.
- [ ] Another user's invite id returns 404.

**Notes/risks**
- None.

### BE-027 WhatsApp Business Cloud API sending with delivery status

**Type:** Enhancement (proposed) · **Priority:** P2 · **Size:** L · **Depends on:** BE-026

**Context**
- CLAUDE.md: "WhatsApp: no API integration"; invites are click-to-chat links sent from the couple's phone, and "sent" is a guess ([`guest.service.ts:1041`](../src/services/guest.service.ts#L1041)). Bulk sending to hundreds of guests is one tap per guest.

**Scope**
- Split before starting: (a) a send job kind on a queue with `attempts: 1` using approved message templates, (b) a webhook endpoint storing delivered/read status, (c) opt-in per wedding. Keep `wa.me` as the fallback.

**Acceptance criteria**
- [ ] Defined per sub-ticket once the Meta business account and template approval are in place.

**Notes/risks**
- Requires a Meta Business account, per-message cost, template approval and a verified sender; this is a product decision more than code.

## Dashboard and live updates

### BE-028 Size the global rate limiter for polling and SSE reconnects

**Type:** Bug · **Priority:** P1 · **Size:** S · **Depends on:** FE-014

**Context**
- `globalLimiter` allows 100 requests per 15 minutes per IP on all of `/api` ([`rateLimiter.middleware.ts:24-40`](../src/middlewares/rateLimiter.middleware.ts#L24)).
- The invite card page polls generation status every 3 s ([`../../ai-wedding-rsvp-generator-frontend/src/hooks/use-inviteCard.ts:61-66`](../../ai-wedding-rsvp-generator-frontend/src/hooks/use-inviteCard.ts#L61)); a generation can take several minutes (120 s per Gemini call, 30 s/90 s backoff), i.e. 60+ polls. The dashboard SSE stream reconnects with a refetch each time ([`use-wedding-live.ts`](../../ai-wedding-rsvp-generator-frontend/src/hooks/use-wedding-live.ts)). A couple on one home IP can hit 429 during normal use, and every 429 on a public RSVP page shows "link isn't valid" (FE-010).

**Scope**
- Raise the global limit substantially (e.g. 1000 / 15 min) and rely on the strict per-route limiters for expensive endpoints; or key authenticated requests by a hash of the bearer token. Pick the simpler one.
- Skip `GET /wedding/:id/live` from the global limiter (it is a long-lived stream).

**Acceptance criteria**
- [ ] One full invite card generation with the page open, plus the dashboard open in another tab, completes without any 429.
- [ ] Unauthenticated floods are still limited.

**Notes/risks**
- Pair with FE-014 (poll back-off).

### BE-029 QR code check-in: data model and endpoint

**Type:** Enhancement (proposed) · **Priority:** P2 · **Size:** M · **Depends on:** FE-020

**Context**
- The landing page advertises "QR code attendance" as being built now ([`../../ai-wedding-rsvp-generator-frontend/src/components/landing/UpcomingSection.tsx:3-11`](../../ai-wedding-rsvp-generator-frontend/src/components/landing/UpcomingSection.tsx#L3)). Each `GuestEventInvite` already has a unique `invite_token` per guest and event ([`schema.prisma:190`](../prisma/schema.prisma#L190)), which is a natural QR payload.

**Scope**
- `checked_in_at` (and optionally `checked_in_count`) on `GuestEventInvite`; `POST /api/guest/invites/check-in` taking the token (authenticated host, ownership-checked, idempotent); dashboard counts of arrivals per event; emit a live event like RSVPs.

**Acceptance criteria**
- [ ] Checking in the same token twice is idempotent and returns the guest name and event.
- [ ] A token from another user's wedding returns 404.
- [ ] Dashboard per-event stats include arrivals.

**Notes/risks**
- The QR must not be the public RSVP URL alone if check-in should require the host; the endpoint is authenticated, so a plain token is fine.

## Infra and quality

### BE-030 CI: type-check, build, Prisma validate, OpenAPI drift

**Type:** Infra · **Priority:** P1 · **Size:** S · **Depends on:** -

**Context**
- No `.github/` workflows; the repo is on GitHub (`moizkapasi28/ai-wedding-rsvp-generator-backend`). `npx tsc --noEmit` passes today, so a green baseline exists.
- The OpenAPI route table must be kept "in step with src/routes/*.ts" by hand ([`scripts/generate-openapi.ts`](../scripts/generate-openapi.ts)); it currently matches, but nothing enforces it.

**Scope**
- A workflow on push/PR: `npm ci`, `npx prisma generate`, `npx prisma validate`, `npx tsc --noEmit`, `npm run build`, `npm run docs:openapi && git diff --exit-code src/openapi.json`, and `npx tsx src/utils/inviteCardGeneration.check.ts`.

**Acceptance criteria**
- [ ] A PR that breaks types, or changes a validation schema without regenerating `openapi.json`, fails CI.
- [ ] Main is green.

**Notes/risks**
- `prisma generate` needs no database; `credits.check.ts` does, so leave it out until a Postgres service is added.

### BE-031 Add `npm test` and unit checks for pure utils

**Type:** Infra · **Priority:** P2 · **Size:** S · **Depends on:** -

**Context**
- `"test": "echo \"Error: no test specified\" && exit 1"` ([`package.json:10`](../package.json#L10)). Assert-based checks exist but are run by hand ([`inviteCardGeneration.check.ts`](../src/utils/inviteCardGeneration.check.ts), [`credits.check.ts`](../src/utils/credits.check.ts)). Pure, import-free logic with no checks: [`reminder.util.ts`](../src/utils/reminder.util.ts) ("Kept free of DB/logger imports so it can be checked in isolation"), [`rsvp.util.ts`](../src/utils/rsvp.util.ts), `normalizePhone` in [`lib/whatsapp.ts`](../src/lib/whatsapp.ts).

**Scope**
- `"test": "tsx --test src/**/*.test.ts"` (node:test, no new framework) plus small tests for `getDueReminder` (first/final/deadline passed/toggles off), `buildRsvpUpdate` (deadline enforcement, disabled questions dropped), `normalizePhone`. Wire into BE-030.

**Acceptance criteria**
- [ ] `npm test` runs and passes locally without a database.
- [ ] Breaking the 7-day first-reminder rule fails a test.

**Notes/risks**
- Keep DB-backed checks (`credits.check.ts`) as a separate script.

### BE-032 Production logging: level from env, JSON output, no unbounded file

**Type:** Infra · **Priority:** P2 · **Size:** S · **Depends on:** -

**Context**
- [`src/config/logger.ts:6-19`](../src/config/logger.ts#L6): level hard-coded to `info`, `pino-pretty` always on (colourised text in production logs), and `./logs/app.log` grows forever inside the container with no rotation.
- Request logs include full URLs, so public RSVP tokens (`/api/rsvp/<token>`) land in logs ([`logger.middleware.ts`](../src/middlewares/logger.middleware.ts)).

**Scope**
- `LOG_LEVEL` env (add to `env.ts` and `.env.example`); pretty output only when `NODE_ENV` is local/development; file output opt-in via env or removed (container stdout is collected already).
- Redact the token segment of `/api/rsvp/:token` URLs in the request logger.

**Acceptance criteria**
- [ ] `NODE_ENV=production` logs JSON lines to stdout and writes no file unless configured.
- [ ] `LOG_LEVEL=debug` works.
- [ ] RSVP request logs show `/api/rsvp/[token]`.

**Notes/risks**
- Update CLAUDE.md's logging line.

### BE-033 Error monitoring for the API and the worker

**Type:** Infra · **Priority:** P2 · **Size:** M · **Depends on:** BE-032

**Context**
- Unhandled errors only reach `logger.error` in [`error.middleware.ts`](../src/middlewares/error.middleware.ts); worker failures only log ([`guest.worker.ts`](../src/workers/guest.worker.ts), [`inviteCard.worker.ts`](../src/workers/inviteCard.worker.ts)). `BILLING` generation failures (Gemini credits depleted) are logged at error level and nobody is notified ([`inviteCard.service.ts:287`](../src/services/inviteCard.service.ts#L287)).

**Scope**
- Add an error tracker (e.g. Sentry Node SDK) behind an optional DSN env var, initialised in `src/index.ts` and `src/workers/index.ts`; report 5xx errors and failed jobs with job name, card id, error code. Alert on `BILLING`.

**Acceptance criteria**
- [ ] With a DSN set, a thrown 500 and a failed job appear in the tracker with request/job context and no passwords or tokens.
- [ ] Without a DSN, nothing changes.

**Notes/risks**
- Scrub request bodies (auth endpoints carry passwords).

### BE-034 `/health` checks PostgreSQL and Redis

**Type:** Infra · **Priority:** P2 · **Size:** S · **Depends on:** -

**Context**
- [`src/index.ts:49-51`](../src/index.ts#L49) always returns `{ status: "ok" }`, even when the database or Redis (queues, rate limiters, live RSVPs) is down.

**Scope**
- `SELECT 1` via Prisma and `PING` via the shared Redis connection with a short timeout; 503 with which dependency failed.

**Acceptance criteria**
- [ ] Stopping Redis makes `/health` return 503 within a couple of seconds; restarting it returns 200.

**Notes/risks**
- Keep it before the rate limiter, as today.

### BE-035 Deployment: persistent Redis and migrations on start

**Type:** Infra · **Priority:** P2 · **Size:** M · **Depends on:** -

**Context**
- [`start.sh:4`](../start.sh#L4) starts `redis-server` inside the app container ([`dockerfile:10`](../dockerfile#L10)) with no persistence, so queued jobs, rate-limit counters and in-flight guest imports vanish on every redeploy.
- Migrations are a manual step ([`README.md:75`](../README.md#L75)); `start.sh` does not run `prisma migrate deploy`.
- The dockerfile installs dev dependencies into the runtime image.

**Scope**
- Use `REDIS_HOST` pointing at a managed or separate Redis when set, and only start the embedded one otherwise (or enable AOF on a mounted volume).
- Run `npx prisma migrate deploy` in `start.sh` before starting the API and worker.
- Optional: multi-stage build with `npm ci --omit=dev` in the final image.

**Acceptance criteria**
- [ ] Redeploying with a job queued does not lose it (external Redis).
- [ ] A new migration is applied automatically on container start; a failing migration stops the container.

**Notes/risks**
- BE-018 covers the invite card side of lost jobs regardless.

### BE-036 Export a typed `env` and stop reading `process.env` inline

**Type:** Tech debt · **Priority:** P2 · **Size:** M · **Depends on:** BE-016

**Context**
- Ponytail at [`src/config/env.ts:6`](../src/config/env.ts#L6): "validates only; callers still read process.env directly — switch them to `env` if typos become a problem". It has: view URLs read the PUT expiry and `AWS_BUCKET_GET_URL_EXPIRE` was never added to the schema (BE-016). There are about 45 inline `process.env.` reads in `src/`.

**Scope**
- Export the parsed `env` object; replace `process.env.X` reads with `env.X` (typed, coerced numbers). Drop `Number(...)` wrappers.

**Acceptance criteria**
- [ ] `grep -rn "process.env\." src` only matches `config/env.ts` (and `NODE_ENV` checks in the rate limiter if kept).
- [ ] `npx tsc --noEmit` passes; app starts with the example env.

**Notes/risks**
- Mechanical; do it in one pass to avoid a half-migrated state.

### BE-037 Enable `strictNullChecks`

**Type:** Tech debt · **Priority:** P2 · **Size:** M · **Depends on:** -

**Context**
- [`tsconfig.json:12`](../tsconfig.json#L12) `"strict": false`. `npx tsc --noEmit --strictNullChecks` currently reports 70 errors. BE-003 (destructuring a possibly-undefined transaction result) is exactly the class of bug this catches.

**Scope**
- Turn on `strictNullChecks` only, fix the 70 errors with real guards (not `!`), leave the rest of `strict` for later.

**Acceptance criteria**
- [ ] `strictNullChecks: true` in `tsconfig.json` and `npx tsc --noEmit` passes.
- [ ] No new non-null assertions except where a comment explains why.

**Notes/risks**
- Touches many files; land it on a quiet day to avoid merge pain.

### BE-038 Fix CLAUDE.md and README drift

**Type:** Tech debt · **Priority:** P2 · **Size:** S · **Depends on:** -

**Context**
- [`CLAUDE.md`](../CLAUDE.md) still references pre-rename names: `aiInviteCardGeneration.check.ts` (now `inviteCardGeneration.check.ts`, line 16), `aiInviteCard.queue.ts` / `runAiInviteCardGenerationJob` / `AIEventInviteCard` (now `inviteCard.queue.ts` / `runInviteCardGenerationJob` / `EventInviteCard`, line 34), `services/aiInviteCardGeneration.service.ts` (line 41), and `authLimiter` (removed, line 45). It does not mention AI credits (`credits.service.ts`, commit `8b52317`) or `credits.check.ts`.
- [`README.md`](../README.md) lists SES only for email; commit `b8bd1a0` added `EMAIL_PROVIDER=ses|smtp`.

**Scope**
- Update both files to match the code (after BE-001 lands, document the auth limiter again).

**Acceptance criteria**
- [ ] Every file and symbol named in CLAUDE.md exists (`grep` each one).
- [ ] README mentions SMTP, AI credits, and the check scripts.

**Notes/risks**
- Keep CLAUDE.md terse; it is loaded into every AI session.
