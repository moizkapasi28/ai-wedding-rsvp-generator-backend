# AI Wedding RSVP Generator Backend

The API behind the AI Wedding RSVP Generator: couples manage weddings, events and guests, design AI invitation cards, send RSVP links over WhatsApp, and track replies live. Built with Node.js, Express, TypeScript, Prisma and Zod.

The frontend lives in the sibling repository `ai-wedding-rsvp-generator-frontend` (production: https://ai-wedding-rsvp-generator.pages.dev).

## Features

- **Accounts**: sign up, email verification, password reset (JWT access and refresh tokens).
- **Weddings, events and guests**: CRUD scoped to the signed-in user, guest filters, Excel import (background job) and export.
- **RSVP pages**: a public page per guest and event, reached through a link with the wedding slug and a per-invite token. Per-event settings choose which questions to ask and set an RSVP deadline.
- **WhatsApp invites and reminders**: `wa.me` click-to-chat links with the message pre-filled, sent from the couple's own WhatsApp. First reminder 7 days after the invite, final reminder in the 3 days before the deadline.
- **Host RSVP updates**: hosts can set a guest's reply from the portal.
- **AI invite cards**: two-stage image generation with Google Gemini, run in a background worker, stored in S3.
- **Live dashboard**: RSVP stats plus a server-sent events stream of new replies (Redis pub/sub, so it works across processes).

## Tech stack

- Node.js 22, Express 5, TypeScript
- PostgreSQL with Prisma 7
- Redis with BullMQ (job queues), rate limiting and live RSVP pub/sub
- Zod (request validation, env validation, OpenAPI generation)
- AWS S3 (files) and SES with Handlebars templates (email)
- Google Gemini (AI invite cards)
- pino (logging)

## Prerequisites

- Node.js 22+
- PostgreSQL
- Redis 6.2+ (BullMQ warns on older versions)
- AWS credentials for S3 and SES, and a Gemini API key for AI invite cards

## Setup

```bash
npm install
cp .env.example .env        # then fill in the values
npx prisma migrate dev
npx prisma generate
```

Environment variables are validated at startup (`src/config/env.ts`); the process exits with a list of anything missing or malformed.

## Running

The API and the background worker are separate processes; run both:

```bash
npm run dev      # API on PORT (default 3000)
npm run worker   # guest imports and AI invite card generation
```

API reference: http://localhost:3000/reference. The spec (`src/openapi.json`) is generated from the route table in `scripts/generate-openapi.ts` and the routes' Zod schemas; regenerate it after changing routes:

```bash
npm run docs:openapi
```

## Project structure

- `src/routes/` Express routes (`authenticate`, `validate(schema)`, controller)
- `src/controllers/` request/response handling
- `src/services/` business logic, including ownership checks
- `src/repositories/` Prisma queries
- `src/validations/` Zod request schemas
- `src/queues/`, `src/workers/` BullMQ queues and the worker process
- `src/lib/` clients and helpers (Prisma, Redis, Gemini, WhatsApp links, live RSVP events)
- `src/config/` logger and env validation
- `prisma/` schema and migrations
- `scripts/` OpenAPI generator

## Deployment

The Docker image (`dockerfile`) builds the app, and `start.sh` runs Redis, the worker and the API in one container. Set the production environment variables there, including `WEB_APP_URL=https://ai-wedding-rsvp-generator.pages.dev`, and apply migrations with `npx prisma migrate deploy`.

## License

ISC License
