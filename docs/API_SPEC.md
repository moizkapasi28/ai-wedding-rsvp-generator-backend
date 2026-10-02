# API Specification — AI Wedding RSVP Generator Backend

As of 2026-10-01. Every endpoint mounted in [src/index.ts](../src/index.ts): 49 `/api` routes plus `GET /health` and `/reference` (51 total). Request rules come from the zod schemas in [src/validations](../src/validations); response shapes from the services/repositories. Architecture context: [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md).

## 1. Conventions

### Base URL

| Item | Value |
|---|---|
| API base | `<host>/api` (routers mounted at `/api/<resource>`, [index.ts](../src/index.ts)) |
| Local | `http://localhost:3000/api` (`PORT`, default 3000) |
| CORS | Single origin `WEB_APP_URL`, `credentials: true` |
| Body | `application/json` (except the guest import upload: `multipart/form-data`) |

### Authentication

| Item | Rule | Source |
|---|---|---|
| Scheme | `Authorization: Bearer <access token>` (HS256 JWT `{ sub, jti, exp }`) | [auth.middleware.ts](../src/middlewares/auth.middleware.ts) |
| Checks | JWT signature and `exp`; `Token` row with the `jti`, type `ACCESS`, not past `expires_at`; user exists | [token.service.ts](../src/services/token.service.ts) |
| Failure | `401 "Please authenticate"` | [auth.middleware.ts](../src/middlewares/auth.middleware.ts) |
| Obtaining tokens | `POST /api/auth/signin`; renew with `POST /api/auth/access-token` (rotates both, invalidates all previous tokens of the user) | [auth.service.ts](../src/services/auth.service.ts) |
| Sessions | One active session per user: sign-in and refresh delete every existing token of the user | [auth.service.ts](../src/services/auth.service.ts) |
| Public credential | RSVP routes `/api/rsvp/:token` use `GuestEventInvite.invite_token` (uuid) only | [rsvp.routes.ts](../src/routes/rsvp.routes.ts) |

### Response envelope

| Case | Body |
|---|---|
| Success | `{ "success": true, "statusCode": <int>, "message": <string>, "data": <T> }` ([response.util.ts](../src/utils/response.util.ts)) |
| `ApiError` | `{ "success": false, "statusCode": <int>, "message": <string> }` ([error.middleware.ts](../src/middlewares/error.middleware.ts)) |
| Validation (400) | `{ "success": false, "message": "<path>: <issue>", "errors": [<zod issues>] }` — no `statusCode` ([validate.middleware.ts](../src/middlewares/validate.middleware.ts)) |
| Unhandled error (500) | `{ "success": false, "statusCode": 500, "message": "Something went wrong! Please try again later" }` |
| Rate limited (429) | `{ "success": false, "message": <limiter message> }` + `RateLimit-*` headers (draft standard), no legacy `X-RateLimit-*` |
| 204 responses | Empty body (Express drops the envelope) |

In the tables below, "data" is the `data` field of the success envelope.

### Rate limiters

All keyed by client IP (`trust proxy` 1), stored in Redis, disabled when `NODE_ENV=local` ([rateLimiter.middleware.ts](../src/middlewares/rateLimiter.middleware.ts)).

| Limiter | Window / max | Redis prefix | Applies to |
|---|---|---|---|
| `globalLimiter` | 15 min / 100 | `rl_global:` | Every `/api/*` request (includes SSE connects and RSVP routes); not `/health`, not `/reference` |
| `imageGenerationLimiter` | 15 min / 5 | `rl_image_gen:` | `POST /api/invite-card/generate-invite` |
| `rsvpLimiter` | 15 min / 30 | `rl_rsvp:` | `PUT /api/rsvp/:token` |

There is no auth-specific limiter.

### Pagination

| Endpoint family | Query | Defaults / limits | Response wrapper |
|---|---|---|---|
| `GET /api/wedding`, `GET /api/event`, `GET /api/guest` | `page`, `limit` as strings, `parseInt`, fallback 1 / 10; no max | offset `(page-1)*limit` | `{ <weddings\|events\|guests>: [...], totalCount, totalPages, currentPage }` |
| `GET /api/page-setting/pages/:weddingId` | `page` (coerced int ≥ 1) | limit fixed at 5 | `{ events: [...], totalCount, totalPages, currentPage }` |
| `GET /api/invite-card/cards/:weddingId` | `page` (≥ 1), `limit` (1–50) | 1 / 5 | `{ events: [...], totalCount, totalPages, currentPage }` |

### Comma-separated list filters

`sides`, `groups`, `events`, `filter` query params are split on `,`, trimmed, empty items dropped; `sides`/`groups` are upper-cased before enum validation ([guest.validations.ts](../src/validations/guest.validations.ts), [event.validations.ts](../src/validations/event.validations.ts), [wedding.validation.ts](../src/validations/wedding.validation.ts)).

### Shared shapes

| Name | Shape | Source |
|---|---|---|
| `AuthTokens` | `{ access: { token, expires_at }, refresh: { token, expires_at } }` | [token.service.ts](../src/services/token.service.ts) |
| `SafeUser` | User row without `password`: `id, first_name, last_name, email, is_email_verified, mobile_number, profile_picture, ai_credits, created_at, updated_at` | [auth.type.ts](../src/types/auth.type.ts) |
| `EventStats` | `{ totalGuests, attendingGuests, declinedGuests, maybeGuests, pendingGuests, completion, progressBar: { confirmed, maybe, declined, pending } }` (percentages rounded) | [event.service.ts](../src/services/event.service.ts) `mapGuestStatsToEvents` |
| `LiveRsvp` | `{ inviteId, guestName, eventTitle, status: "ATTENDING"\|"MAYBE"\|"DECLINED", plusOnes: int\|null, respondedAt: ISO string }` | [rsvpEvents.ts](../src/lib/rsvpEvents.ts) |
| `InviteReply` | `{ id, status, plus_ones, dietary, song_request, message, invite_deadline, responded_at }` | [rsvp.repository.ts](../src/repositories/rsvp.repository.ts) |
| Enum values | See [TECHNICAL_ARCHITECTURE.md §5](./TECHNICAL_ARCHITECTURE.md#enums) (`NON_VEGETARAIN` is the real value) | [schema.prisma](../prisma/schema.prisma) |

## 2. Endpoint index

Auth column: B = Bearer access token required, P = public. Limiter column lists route-specific limiters (global applies to all `/api`).

| # | Method | Path | Auth | Limiter | Success |
|---|---|---|---|---|---|
| 1 | GET | `/health` | P | none | 200 |
| 2 | GET | `/reference` | P | none | 200 HTML |
| 3 | POST | `/api/auth/signup` | P | | 201 |
| 4 | POST | `/api/auth/signin` | P | | 200 |
| 5 | POST | `/api/auth/verify-email` | P | | 200 |
| 6 | POST | `/api/auth/resend-verify-email` | P | | 204 |
| 7 | POST | `/api/auth/forgot-password` | P | | 204 |
| 8 | PATCH | `/api/auth/reset-password` | P | | 200 |
| 9 | POST | `/api/auth/access-token` | P | | 200 |
| 10 | POST | `/api/auth/logout` | B | | 200 |
| 11 | GET | `/api/auth/me` | B | | 200 |
| 12 | PATCH | `/api/auth/me` | B | | 200 |
| 13 | GET | `/api/wedding` | B | | 200 |
| 14 | POST | `/api/wedding` | B | | 201 |
| 15 | GET | `/api/wedding/:id` | B | | 200 |
| 16 | GET | `/api/wedding/:id/dashboard` | B | | 200 |
| 17 | GET | `/api/wedding/:id/live` | B | | 200 SSE |
| 18 | PATCH | `/api/wedding/:id` | B | | 200 |
| 19 | DELETE | `/api/wedding/:id` | B | | 200 |
| 20 | GET | `/api/event` | B | | 200 |
| 21 | POST | `/api/event` | B | | 201 |
| 22 | GET | `/api/event/:id` | B | | 200 |
| 23 | PATCH | `/api/event/:id` | B | | 200 |
| 24 | DELETE | `/api/event/:id` | B | | 200 |
| 25 | GET | `/api/guest` | B | | 200 |
| 26 | GET | `/api/guest/export` | B | | 200 xlsx |
| 27 | GET | `/api/guest/:id` | B | | 200 |
| 28 | GET | `/api/guest/template/download/:id` | B | | 200 xlsx |
| 29 | POST | `/api/guest/template/upload/:id` | B | | 202 |
| 30 | POST | `/api/guest` | B | | 201 |
| 31 | PATCH | `/api/guest/:id` | B | | 200 |
| 32 | DELETE | `/api/guest/:id` | B | | 200 |
| 33 | GET | `/api/guest/import-status/:jobId` | B | | 200 |
| 34 | GET | `/api/guest/invites/whatsapp` | B | | 200 |
| 35 | POST | `/api/guest/invites/:inviteId/mark-sent` | B | | 200 |
| 36 | GET | `/api/guest/invites/reminders` | B | | 200 |
| 37 | POST | `/api/guest/invites/:inviteId/mark-reminded` | B | | 200 |
| 38 | GET | `/api/page-setting/pages/:weddingId` | B | | 200 |
| 39 | GET | `/api/page-setting/:id` | B | | 200 |
| 40 | GET | `/api/page-setting/event/:eventId` | B | | 200 |
| 41 | PATCH | `/api/page-setting/:id` | B | | 200 |
| 42 | POST | `/api/page-setting/generate-image` | B | | 200 |
| 43 | GET | `/api/invite-card/cards/:weddingId` | B | | 200 |
| 44 | GET | `/api/invite-card/:id/generation-status` | B | | 200 |
| 45 | PATCH | `/api/invite-card/:id` | B | | 200 |
| 46 | POST | `/api/invite-card/generate-invite` | B | image | 202 |
| 47 | POST | `/api/general/generate-upload-url` | B | | 200 |
| 48 | POST | `/api/general/generate-view-url` | B | | 200 |
| 49 | PUT | `/api/rsvp/invite/:inviteId` | B | | 200 |
| 50 | GET | `/api/rsvp/:token` | P | | 200 |
| 51 | PUT | `/api/rsvp/:token` | P | rsvp | 200 |

## 3. System

| Method, path | Response | Notes |
|---|---|---|
| `GET /health` | `200 { status: "ok", timestamp: ISO }` (no envelope) | Registered before the global limiter; no DB/Redis check ([index.ts](../src/index.ts)) |
| `GET /reference` | Scalar API reference UI over [src/openapi.json](../src/openapi.json) | Not in `openapi.json` itself |

## 4. Auth — `/api/auth`

Router [auth.routes.ts](../src/routes/auth.routes.ts), controller [auth.controller.ts](../src/controllers/auth.controller.ts), service [auth.service.ts](../src/services/auth.service.ts), schemas [auth.validation.ts](../src/validations/auth.validation.ts). All string fields below are plain `z.string()` with no format or length rules unless noted.

### POST /signup (public)

| Body field | Type | Required | Rules |
|---|---|---|---|
| `firstName` | string | yes | |
| `lastName` | string | yes | |
| `mobileNumber` | string | yes | |
| `email` | string | yes | not format-checked |
| `password` | string | yes | no strength rule |

| Result | Detail |
|---|---|
| 201 data | `SafeUser` (new user, unverified). Sends verification email (failure is swallowed). |
| 409 | Email belongs to a verified user |
| 500 | Email belongs to an unverified user (unique-constraint violation on create) |

### POST /signin (public)

| Body | `email` string (req), `password` string (req) |
|---|---|
| 200 data | `{ user: SafeUser, tokens: AuthTokens }`; deletes all previous tokens of the user |
| 404 | `Invalid email or password` (unknown email or wrong password) |
| 403 | Account unverified; a new verification email is sent |

### POST /verify-email (public)

| Body | `token` string (req, trimmed) — from the emailed link `WEB_APP_URL/verify-email?token=…` |
|---|---|
| 200 data | `{}`; sets `is_email_verified`, deletes the token; already-verified users also get 200 |
| 401 | `Invalid link or link has expired` |
| 404 | User not found |

### POST /resend-verify-email (public)

| Body | `email` string (req) |
|---|---|
| 204 | Always for any email; sends a new verification email if the user exists |

### POST /forgot-password (public)

| Body | `email` string (req) |
|---|---|
| 204 | Known email: reset email sent with link `WEB_APP_URL/reset-password?token=…` |
| 500 | Unknown email (service destructures `undefined`) |

### PATCH /reset-password (public)

| Body | `token` string (req), `newPassword` string (req, no rules) |
|---|---|
| 200 data | `{}`; password re-hashed, reset token deleted. Existing sessions are not revoked. |
| 401 | `Invalid link or link has expired` |

### POST /access-token (public)

| Body | `refreshToken` string (req) |
|---|---|
| 200 data | `AuthTokens` (new pair; all old tokens deleted) |
| 404 | User not found |
| 500 | Invalid, expired or already-rotated refresh token (plain `Error` is not mapped to 401) |

### POST /logout (Bearer)

| Body | `refreshToken` string (req) |
|---|---|
| 200 data | `{}`; deletes every token of the refresh token's user |
| 500 | Invalid refresh token (same mapping issue as above) |

The refresh token's user is not compared with `req.user`.

### GET /me (Bearer)

| 200 data | `SafeUser` (selected columns, [user.repository.ts](../src/repositories/user.repository.ts) `findUserProfileById`) |
|---|---|
| 404 | User not found |

### PATCH /me (Bearer)

| Body field | Type | Required | Maps to |
|---|---|---|---|
| `firstName` | string | no | `first_name` |
| `lastName` | string | no | `last_name` |
| `mobileNumber` | string | no | `mobile_number` |
| `profilePicture` | string \| null | no | `profile_picture` (S3 key; not ownership-checked) |

| 200 data | Full `User` row, **including the `password` hash** |
|---|---|

## 5. Weddings — `/api/wedding`

Router [wedding.routes.ts](../src/routes/wedding.routes.ts), controller [wedding.controller.ts](../src/controllers/wedding.controller.ts), service [wedding.service.ts](../src/services/wedding.service.ts), schemas [wedding.validation.ts](../src/validations/wedding.validation.ts). Ownership: `getUserWeddingService(user.id, id)` → `404 Wedding not found` on every `:id` route.

### GET / — list my weddings

| Query | Type | Default | Rules |
|---|---|---|---|
| `page`, `limit` | string | "1", "10" | parseInt |
| `stats` | string | "false" | `"true"` enables stats and the filters below |
| `search` | string | "" | Postgres full-text on title, city, venue, groom_name, bride_name; or a parseable date matches that day |
| `filter` | CSV | | items in `this_week`, `upcoming`, `completed` (OR-ed) |
| `sortBy` | enum | `created_at` | `date`, `created_at` |
| `sortOrder` | enum | `desc` | `asc`, `desc` |

| 200 data | `{ weddings, totalCount, totalPages, currentPage }` |
|---|---|
| `stats=true` item | Wedding row + `tag` ("Completed" / "This Week" / "N days later"), `totalGuests`, `totalEvents`, `confirmationRate` (ATTENDING ÷ all invites × 100, 2 decimals) |
| `stats` not `true` | Plain wedding rows ordered by `created_at desc`; `search`, `filter`, `sortBy`, `sortOrder` are ignored |

### POST / — create

| Body field | Type | Required | Rules |
|---|---|---|---|
| `title` | string | yes | 3–100 |
| `bride_name` | string | yes | 1–50 |
| `groom_name` | string | yes | 1–50 |
| `date` | string | yes | `YYYY-MM-DD` or ISO 8601 |
| `venue` | string | yes | 1–200 |
| `address` | string | yes | 1–200 |
| `city` | string | yes | 1–50 |
| `message` | string | no | |

| 201 data | Wedding row; `slug` derived from `title` (not unique) |
|---|---|

### GET /:id

| Params | `id` uuid |
|---|---|
| 200 data | Wedding row |

### GET /:id/dashboard

| 200 data field | Shape |
|---|---|
| `stats` | `{ totalGuests, guestsThisWeek, accommodationRequired, attending, pending, confirmationRate (int %), responsesThisWeek }` — "this week" = last 7 calendar days in server time |
| `events` | Every event (date asc) with `stats: EventStats` |
| `dietary` | `[{ dietary, count }]` over ATTENDING invites with a dietary value |
| `sides` | `[{ side, count }]` over guests |
| `dailyResponses` | 7 items `[{ date: "YYYY-MM-DD", count }]` |
| `recentRsvps` | Last 10 replies as `LiveRsvp[]` |

### GET /:id/live — SSE

See [§14 SSE](#14-server-sent-events). Ownership checked before headers are sent (404 as JSON if not owned).

### PATCH /:id

| Body | Any subset of the create fields, same rules. `title` change recomputes `slug` (old RSVP links still resolve by token). |
|---|---|
| 200 data | Updated wedding row |

### DELETE /:id

| 200 data | `{}`; cascades to events, guests, invites, page settings, cards |
|---|---|

## 6. Events — `/api/event`

Router [event.routes.ts](../src/routes/event.routes.ts), controller [event.controller.ts](../src/controllers/event.controller.ts), service [event.service.ts](../src/services/event.service.ts), schemas [event.validations.ts](../src/validations/event.validations.ts).

### GET / — list a wedding's events

| Query | Type | Required | Rules |
|---|---|---|---|
| `weddingId` | uuid | yes | Ownership: `getUserWeddingService` → 404 |
| `page`, `limit` | string | no | "1", "10" |
| `stats` | string | no | `"true"` adds `stats: EventStats` per event |
| `search` | string | no | case-insensitive contains on title, venue, city |
| `sides` | CSV of `EventSide` | no | |
| `sort` | enum | no | `newest` (default, created_at desc), `date_asc`, `date_desc` |

| 200 data | `{ events, totalCount, totalPages, currentPage }` |
|---|---|

### POST / — create

| Body field | Type | Required | Rules |
|---|---|---|---|
| `weddingId` | uuid | yes | Ownership → 404 |
| `title` | string | yes | 1–100 |
| `description` | string | yes | 1–250 |
| `event_side` | `EventSide` | yes | BRIDE, GROOM, BOTH |
| `date` | string | yes | `YYYY-MM-DD` or ISO 8601 |
| `time` | string | yes | `HH:mm` 24h |
| `venue` | string | yes | 1–200 |
| `address` | string | yes | 1–200 |
| `city` | string | yes | 1–50 |
| `latitude`, `longitude` | string | no | 1–50 |

| 201 data | Event row. In one transaction also creates the event's `GuestEventInviteFormat` and `EventInviteCard`. |
|---|---|

### GET /:id · PATCH /:id · DELETE /:id

| Route | Params / body | 200 data | Errors |
|---|---|---|---|
| GET | `id` uuid | Event row | 400 `Invalid Event or Event Not Found` (not owned or missing) |
| PATCH | `id`; body = create fields minus `weddingId`, all optional | Updated event row | 400 as above |
| DELETE | `id` | `{}`; also deletes guests of the wedding left with no invites | 400 as above |

Ownership: `verifyWeddingEventOwnershipService(eventId, userId)`.

## 7. Guests — `/api/guest`

Router [guests.routes.ts](../src/routes/guests.routes.ts), controller [guest.controller.ts](../src/controllers/guest.controller.ts), service [guest.service.ts](../src/services/guest.service.ts), schemas [guest.validations.ts](../src/validations/guest.validations.ts).

### Guest list query (shared by `GET /` and `GET /export`)

| Query | Type | Required | Rules |
|---|---|---|---|
| `weddingId` | uuid | yes | Ownership: `getUserWeddingService` → 404 |
| `eventId` | uuid | no | Guests with an invite to this event |
| `page`, `limit` | string | no | "1", "10" (ignored by export) |
| `search` | string | no | Full-text on name, email; contains on mobile_number |
| `events` | CSV of uuid | no | Guests with an invite to any of these |
| `sides` | CSV of `Side` | no | |
| `groups` | CSV of `Group` | no | |
| `inviteSent` | enum | no | `sent` / `not_sent`; combined with `events` on the same invite |

### Endpoints

| Method, path | Input | 200/201/202 data | Errors | Ownership |
|---|---|---|---|---|
| `GET /` | list query | `{ guests, totalCount, totalPages, currentPage }`; guest = `id, name, email, mobile_number, side, group, accomodation_required, accomodation_address, note, created_at, updated_at, guestEventInvite[{ id, status, plus_ones, dietary, song_request, message, invite_deadline, responded_at, invite_sent_at, created_at, updated_at, event{ id, title, event_side, created_at, updated_at } }]`; newest first | 404 | wedding |
| `GET /export` | list query | xlsx `Guest_List.xlsx`: one sheet per event (guest fields + invite status, plus ones, dietary, song, message, deadline, responded at; "Not Invited" when none), or one plain sheet if no events | 404 | wedding |
| `GET /:id` | `id` uuid (guest) | Guest row + `guestEventInvite[]` (each with full `event`), newest first | 403 `Guest not found` | guest → wedding owner |
| `POST /` | body below | 201 guest row (no invites included) | 400 event not owned / events from different weddings; 400 validation | every `eventIds` item via event ownership |
| `PATCH /:id` | `id`; body = all create fields optional | Updated guest row | 403; 400 event from another wedding | guest → wedding; new events |
| `DELETE /:id` | `id` | `{}` | 403 | guest → wedding |
| `GET /template/download/:id` | `id` uuid (**wedding** id) | xlsx `Guest_List_Template.xlsx` with hidden `_meta` sheet | 404; 400 wedding has no events | wedding |
| `POST /template/upload/:id` | `id` uuid (wedding id); multipart `file` (.xlsx, ≤ 5 MB) | 202 `{ jobId, message }` | 400 `File is required`; 500 over 5 MB | none at enqueue (see §13) |
| `GET /import-status/:jobId` | `jobId` string (BullMQ numeric id) | see §13 | 404 `Job not found` (missing or another user's) | `job.data.userId` |

#### POST / body

| Field | Type | Required | Rules |
|---|---|---|---|
| `eventIds` | uuid[] | yes | ≥ 1; all owned and in one wedding |
| `name` | string | yes | 1–50 |
| `mobile_number` | string | yes | 1–15, must normalise to ≥ 8 digits (`normalizePhone`) |
| `email` | string \| null | no | trimmed, ≤ 50; blank → null |
| `side` | `Side` | yes | |
| `group` | `Group` | yes | |
| `accomodation_required` | boolean | no | default false |
| `accomodation_address` | string | no | trimmed, ≤ 250 |
| `note` | string | no | trimmed, ≤ 100 |

Behaviour: if a guest with the exact same `mobile_number` exists in the wedding, it is reused (other fields ignored) and only missing invites are added. Each new invite gets a fresh `invite_token`, `invite_format_id` of the event's format, and `invite_deadline` = the format's `rsvp_deadline`.

#### PATCH /:id semantics

| Field | Behaviour |
|---|---|
| `eventIds` | Treated as the full desired set. Omitted = `[]` → **all invites removed**. Added events get new invites; removed events' invites are deleted. |
| `accomodation_required` | Defaults to `false` when omitted (zod default survives `.partial()`), so it is always written |
| Other fields | Written only when present |

### Invites and reminders

| Method, path | Input | 200 data | Errors | Ownership |
|---|---|---|---|---|
| `GET /invites/whatsapp` | Query: exactly one of `eventId` uuid, `guestId` uuid | `[{ id, guest_id, guest_name, event_id, event_title, status, invite_sent_at, rsvp_url, whatsapp_url \| null }]` sorted by guest name; `whatsapp_url` null when the phone does not normalise | 400 `Provide either eventId or guestId` | `event.wedding.user_id` filter (foreign ids return `[]`) |
| `POST /invites/:inviteId/mark-sent` | `inviteId` uuid | Updated `GuestEventInvite` row (includes `invite_token`) with `invite_sent_at = now` | 404 `Invite not found` | `findGuestEventInviteForUser` |
| `GET /invites/reminders` | Query `eventId` uuid (req) | `[{ id, guest_id, guest_name, event_id, event_title, reminder: "FIRST"\|"FINAL", invite_deadline, rsvp_url, whatsapp_url \| null }]` — only PENDING invites with a reminder due now ([reminder.util.ts](../src/utils/reminder.util.ts)) | — | `event.wedding.user_id` filter |
| `POST /invites/:inviteId/mark-reminded` | `inviteId` uuid; body `reminder`: `FIRST` \| `FINAL` (req) | Updated invite row with `first_reminder_sent_at` or `final_reminder_sent_at = now` | 404 | `findGuestEventInviteForUser` |

`rsvp_url` = `WEB_APP_URL/rsvp/<wedding slug or "invite">/<invite_token>`; `whatsapp_url` = `https://wa.me/<digits>?text=<message>` ([whatsapp.ts](../src/lib/whatsapp.ts)).

## 8. RSVP page settings — `/api/page-setting`

Router [eventInviteFormat.route.ts](../src/routes/eventInviteFormat.route.ts), controller [eventInviteFormat.controller.ts](../src/controllers/eventInviteFormat.controller.ts), service [eventInviteFormat.service.ts](../src/services/eventInviteFormat.service.ts), schemas [eventInviteFormat.validation.ts](../src/validations/eventInviteFormat.validation.ts). Resource = `GuestEventInviteFormat`.

| Method, path | Input | 200 data | Errors | Ownership |
|---|---|---|---|---|
| `GET /pages/:weddingId` | `weddingId` uuid; query `page` | `{ events, totalCount, totalPages, currentPage }` (5 per page, created_at asc); event = row + `guestEventInviteFormat[]` + `wedding` + `inviteCard[{ generated_invite_image_url }]` + `stats{ total, PENDING, ATTENDING, DECLINED, MAYBE }` | 404 wedding | `getUserWeddingService` |
| `GET /:id` | `id` uuid (format id) | Format row + `event` | 404 `Event Invite Format Not Found` (missing or not owned) | event ownership |
| `GET /event/:eventId` | `eventId` uuid | Format row | 400 not owned; 404 missing | event ownership. Code comment: not used by the client. |
| `PATCH /:id` | `id` uuid; body below | Updated format row | 404 missing; 400 not owned; 400 `Invalid image for <field>` | event ownership + `assertOwnedImageKeys(raw_image, generated_image)` |
| `POST /generate-image` | body below | `{ key }` — S3 key of the generated illustration under `users/<userId>/generated-images/rsvp-generated-images/` | 400 not owned / bad key; 402 credits; 500 Gemini or unknown style/attire id (credits refunded) | event ownership |

### PATCH /:id body

| Field | Type | Required | Rules / behaviour |
|---|---|---|---|
| `dietary_preference`, `song_request`, `message`, `plus_ones` | boolean | no | **Default false when omitted** — send all toggles every time |
| `first_reminder`, `final_reminder` | boolean | no | Default false when omitted |
| `rsvp_deadline` | ISO datetime (UTC `Z`) \| null | no | Omitted = unchanged; set/null also rewrites every invite's `invite_deadline` in the same transaction |
| `raw_image`, `generated_image` | string \| null | no | Trimmed; S3 key under caller prefix or unchanged |
| `illustration_style`, `illustration_theme`, `photo_type`, `bride_attire_style`, `groom_attire_style` | string \| null | no | Trimmed |

### POST /generate-image body

| Field | Type | Required | Rules |
|---|---|---|---|
| `eventId` | uuid | yes | |
| `rawImageKey` | string | yes | Trimmed, ≥ 1; under caller prefix or equal to the format's saved `raw_image` |
| `photoType` | enum | yes | `couple`, `bride`, `groom` |
| `illustrationStyle` | string | yes | ≥ 1; must be a `STYLE_CATALOG` id ([styleCatelogue.util.ts](../src/utils/styleCatelogue.util.ts)) or the call 500s |
| `attireId`, `brideAttireId`, `groomAttireId` | string \| null | no | `ATTIRE_CATALOG` ids ([attireCatelogue.util.ts](../src/utils/attireCatelogue.util.ts)) |
| `customStyleNote`, `illustrationTheme` | string \| null | no | |

Synchronous: costs 5 credits, model `gemini-3.1-flash-image`, 1:1. Not covered by `imageGenerationLimiter`.

## 9. Invite cards — `/api/invite-card`

Router [inviteCard.routes.ts](../src/routes/inviteCard.routes.ts), controller [inviteCard.controller.ts](../src/controllers/inviteCard.controller.ts), service [inviteCard.service.ts](../src/services/inviteCard.service.ts), schemas [inviteCard.validation.ts](../src/validations/inviteCard.validation.ts). Resource = `EventInviteCard`.

| Method, path | Input | Success data | Errors | Ownership |
|---|---|---|---|---|
| `GET /cards/:weddingId` | `weddingId` uuid; query `page` ≥ 1, `limit` 1–50 (default 5) | 200 `{ events, totalCount, totalPages, currentPage }`; event = row + `inviteCard[]` (full card) + `wedding`; created_at asc | 404 wedding | `getUserWeddingService` |
| `GET /:id/generation-status` | `id` uuid (card id) | 200, see §13 | 404 card; 400 not owned | event ownership |
| `PATCH /:id` | `id` uuid; card body (all optional) | 200 updated card row | 404; 400 not owned; 400 `Invalid image for <field>` | event ownership + `assertOwnedImageKeys` on `reference_image`, `generated_image`, `couple_raw_image_key`, `generated_invite_image_url` |
| `POST /generate-invite` | generate body | 202 `{ inviteCardId, jobId, status: "QUEUED" }` | 400 validation / bad key / not owned; 402 credits; 404 card missing; 409 already generating; 429 limiter | event ownership + key check |

### Card body fields (PATCH and generate)

| Field | Type | PATCH | Generate |
|---|---|---|---|
| `eventId` | uuid | — | required |
| `card_source` | enum | `PRESETS`, `EXAMPLE`, `UPLOAD` | `PRESETS` (default) or `EXAMPLE` |
| `photo_type` | enum `couple`/`bride`/`groom` | nullable | optional (not nullable) |
| `design_preset`, `texture_emulation`, `typography_pairing`, `metallic_accents`, `negative_space`, `monogram_style`, `text_alignment`, `edge_styling` | string \| null | optional | **required non-blank when `card_source = PRESETS`** |
| `additional_details`, `custom_message` | string \| null | optional | optional |
| `reference_image` | string \| null (S3 key) | optional | **required when `EXAMPLE`** |
| `generated_image`, `generated_invite_image_url` | string \| null (S3 key) | optional | optional |
| `illustration_style`, `bride_attire_style`, `groom_attire_style` | string \| null | optional | optional |
| `couple_raw_image_key` | string \| null (S3 key) | optional | optional; trimmed, ≥ 1 if present |
| `photo_placement` | `SWAP_IN_PLACE` \| `FRAMED_INSET` \| null | optional | **required when `EXAMPLE` and `couple_raw_image_key` set** |

Preset keys ([manualDesignCatalogue.util.ts](../src/utils/manualDesignCatalogue.util.ts); unknown values are passed to the prompt as literal text):

| Field | Known keys |
|---|---|
| `design_preset` | classic_elegant, modern_minimalist, rustic_botanical, vintage_royal, moody_avant_garde |
| `texture_emulation` | smooth_matte, deckled_watercolor, heavy_linen, frosted_vellum, pearl_shimmer |
| `metallic_accents` | none, gold_foil, silver_filigree, rose_gold_leaf, holographic_edge |
| `negative_space` | centered_core, bottom_heavy, asymmetric_left, bordered_frame, floating_cloud |
| `monogram_style` | none, calligraphic_crest, modern_serif, floral_wreath, geometric_deco |
| `edge_styling` | sharp_cut, torn_deckled, gold_gilded, scalloped_frame, floral_bleed |
| `text_alignment` | strict, cascading, geometric |

Generate behaviour: the submitted config (minus `eventId`) is saved on the card, 10 credits are charged, status becomes `QUEUED`, and the worker generates from the stored record. `UPLOAD` cards are saved with `PATCH` only.

## 10. Files — `/api/general`

Router [general.routes.ts](../src/routes/general.routes.ts), service [general.service.ts](../src/services/general.service.ts), schemas [general.validation.ts](../src/validations/general.validation.ts).

| Method, path | Body | 200 data | Errors |
|---|---|---|---|
| `POST /generate-upload-url` | `object_key` string (trimmed, 1–512), `mime_type` string (trimmed, ≥ 1) | `{ url, object_key }` — key rewritten to `users/<userId>/<key without leading />` unless already prefixed; presigned `PutObject` with that `Content-Type`, valid `AWS_BUCKET_PUT_URL_EXPIRE` s | — |
| `POST /generate-view-url` | `object_key` string (trimmed, 1–512) | `{ url, object_key }` — presigned `GetObject` | 404 `File not found` unless under caller prefix or referenced by a record the caller owns ([general.repository.ts](../src/repositories/general.repository.ts)) |

Clients must store the returned `object_key`, not the requested one.

## 11. RSVP — `/api/rsvp`

Router [rsvp.routes.ts](../src/routes/rsvp.routes.ts), controller [rsvp.controller.ts](../src/controllers/rsvp.controller.ts), service [rsvp.service.ts](../src/services/rsvp.service.ts), schemas [rsvp.validation.ts](../src/validations/rsvp.validation.ts). `/invite/:inviteId` is declared before `/:token`.

### Reply body (both PUT routes)

| Field | Type | Required | Rules |
|---|---|---|---|
| `status` | enum | yes | `ATTENDING`, `MAYBE`, `DECLINED` |
| `plus_ones` | integer | no | 0–9; saved only if the format's `plus_ones` is on |
| `dietary` | `Dietary` | no | saved only if `dietary_preference` is on |
| `song_request` | string | no | trimmed, ≤ 500; saved only if `song_request` is on |
| `message` | string | no | trimmed, ≤ 500; saved only if `message` is on |

Every save sets `responded_at = now` and publishes a `LiveRsvp` event ([§14](#14-server-sent-events)).

| Method, path | Auth | Input | 200 data | Errors |
|---|---|---|---|---|
| `GET /:token` | public | `token` uuid | see below | 404 `This invitation link isn't valid` |
| `PUT /:token` | public, `rsvpLimiter` | `token`; reply body | `InviteReply` | 404; 409 `RSVPs for this event are closed` (past `invite_deadline`) |
| `PUT /invite/:inviteId` | Bearer | `inviteId` uuid; reply body | `InviteReply` | 404 `Invite not found` (missing or not owned via `event.wedding.user_id`). Deadline not enforced. |

`GET /:token` data:

| Field | Shape |
|---|---|
| `guest` | `{ name, accomodation_required, accomodation_address }` |
| `wedding` | `{ bride_name, groom_name, slug }` |
| `event` | `{ id, title, description, date, time, venue, address, city, latitude, longitude, event_side, format, invite, invite_card_url }` |
| `event.format` | `{ dietary_preference, plus_ones, song_request, message, illustration_url }` |
| `event.invite` | `InviteReply` |
| `event.invite_card_url`, `event.format.illustration_url` | Presigned GET URLs (expire after `AWS_BUCKET_PUT_URL_EXPIRE` s) or `null` |

## 12. Error status reference

| Status | Produced by |
|---|---|
| 400 | zod validation; `ApiError(400)` for not-owned events/cards/formats, bad image keys, cross-wedding events, missing upload file, empty template |
| 401 | `authenticate`; invalid verify/reset link |
| 402 | `spendCredits` (insufficient AI credits) |
| 403 | Guest not found/not owned; unverified sign-in |
| 404 | Wedding not owned, invite/job/card/format/file not found, sign-in failure, invalid RSVP token |
| 409 | Duplicate verified email; generation already in flight; RSVP after deadline |
| 429 | Rate limiters |
| 500 | Unhandled errors (see quirks in [TECHNICAL_ARCHITECTURE.md §12](./TECHNICAL_ARCHITECTURE.md#12-conventions-and-quirks)) |

## 13. Async job endpoints and polling contract

| Job | Start | Start response | Poll | Terminal condition |
|---|---|---|---|---|
| Guest import | `POST /api/guest/template/upload/:weddingId` | `202 { jobId, message }` | `GET /api/guest/import-status/:jobId` | `state` is `completed` or `failed` |
| Invite card | `POST /api/invite-card/generate-invite` | `202 { inviteCardId, jobId, status: "QUEUED" }` | `GET /api/invite-card/:inviteCardId/generation-status` | `status` is `COMPLETED` or `FAILED` |

No polling interval is prescribed by the backend; both status endpoints are subject to the global limiter (100 requests / 15 min / IP).

### Guest import status data

| Field | Meaning |
|---|---|
| `id` | BullMQ job id |
| `state` | BullMQ state (`waiting`, `active`, `delayed`, `completed`, `failed`, …) |
| `progress` | 0 until parsing finishes, then 10–100 as rows are saved |
| `result` | When completed: `{ totalProcessed, successful, failed, errors: [{ row, error }] }` (row = Excel row number) |
| `failedReason` | When failed: e.g. template belongs to another wedding, `_meta`/`Guest List` sheet unreadable |

Jobs are single-attempt and kept in Redis indefinitely (`removeOnComplete: false`).

### Invite card generation status data

| Field | Meaning |
|---|---|
| `id`, `event_id` | Card and event |
| `status` | `IDLE`, `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`; returns to `QUEUED` between job attempts |
| `stage` | `DESIGN`, `TYPESETTING`, or null |
| `error`, `error_code` | Last failure message and `GENERATION_ERROR_CODE` (kept while retrying) |
| `attempt`, `max_attempts` | Current/upcoming attempt, and 3 |
| `job_id` | BullMQ job id |
| `generated_invite_image_url` | S3 key of the final card (resolve via `generate-view-url`) |
| `started_at`, `completed_at` | Timestamps |

Side effect: polling a QUEUED/PROCESSING card whose heartbeat is older than 10 minutes marks it `FAILED` with `TIMEOUT` and refunds the credits.

## 14. Server-sent events

`GET /api/wedding/:id/live` — Bearer auth (so clients must use `fetch` streaming, not `EventSource`), wedding ownership, global limiter applies to the connect.

| Item | Value |
|---|---|
| Headers | `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no` |
| Heartbeat | Comment line `: ping` every 25 s |
| Event | `event: rsvp` then `data: <LiveRsvp JSON>` then blank line |
| Scope | Only replies for this wedding (from guests or hosts, any API instance or process) |
| Replay | None; missed events are not resent. Use `GET /api/wedding/:id/dashboard` (`recentRsvps`) to seed or resync. |

Example frame ([wedding.controller.ts](../src/controllers/wedding.controller.ts)):

```
event: rsvp
data: {"inviteId":"…","guestName":"…","eventTitle":"…","status":"ATTENDING","plusOnes":1,"respondedAt":"2026-10-01T10:00:00.000Z"}

```

## 15. Cross-check against src/openapi.json

[src/openapi.json](../src/openapi.json) was last regenerated in commit `cedf503` (2026-09-22) by [generate-openapi.ts](../scripts/generate-openapi.ts). It lists 50 operations: all 49 `/api` routes above plus `/health`; methods, paths, auth flags, params and body field names match the routers.

| # | Mismatch / gap | Code | openapi.json |
|---|---|---|---|
| 1 | Guest `email` optionality (stale since commit `feca8ed`, 2026-09-29) | `POST /api/guest` `email`: optional, nullable, trimmed, ≤ 50, blank → null | `email` required, `minLength: 1`, `maxLength: 50`, not nullable |
| 2 | Conditional requirements on `generate-invite` | PRESETS requires 8 design fields; EXAMPLE requires `reference_image`, and `photo_placement` when a couple photo is given (`superRefine`) | Only `eventId` required; conditions not expressible |
| 3 | Status codes | Endpoints also return 402, 403, 409, 429, 500; success codes are 200/201/202/204 | Every operation documents only `2XX`, 400, 401 (auth routes), 404 |
| 4 | Success payloads | Specific `data` shapes (§4–§11) | Generic `SuccessResponse` with untyped `data` |
| 5 | Error envelope | `ApiError` responses include `statusCode`; validation responses do not | `ErrorResponse` has `success`, `message`, `errors` only |
| 6 | Rate limits | Global, image, RSVP limiters | Not documented (summary of `generate-invite` says "rate limited") |
| 7 | Upload limit | multer 5 MB, field `file` | Field `file` documented, size limit not |
| 8 | Servers | Deployed behind `WEB_APP_URL` CORS | Only `http://localhost:3000` |
| 9 | `/reference` | Served | Not listed (expected) |
| 10 | Param descriptions copied from wrong schemas | `template/download/:id` and `template/upload/:id` take a wedding id; `GET /api/event/:id` takes an event id; `page-setting/pages/:weddingId` takes a wedding id | Described as "Guest Id is required", "Wedding ID is required", "Event ID is required" respectively (zod `.describe` text) |

Regenerate with `npm run docs:openapi` to fix item 1; items 2–8 need generator changes.
