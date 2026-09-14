// Builds src/openapi.json (served at /reference) from the route table below and each route's
// zod validation schema. Run `npm run docs:openapi` after adding or changing a route.
import { writeFileSync } from "node:fs";
import path from "node:path";
import z from "zod";
import * as aiInviteCard from "../src/validations/aiInviteCard.validation";
import * as auth from "../src/validations/auth.validation";
import * as event from "../src/validations/event.validations";
import * as inviteFormat from "../src/validations/eventInviteFormat.validation";
import * as general from "../src/validations/general.validation";
import * as guest from "../src/validations/guest.validations";
import * as rsvp from "../src/validations/rsvp.validation";
import * as wedding from "../src/validations/wedding.validation";

type Route = {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  tag: string;
  summary: string;
  schema?: z.ZodObject;
  // Signed-in only (Bearer access token); defaults to true
  auth?: boolean;
  response?: "json" | "xlsx" | "event-stream";
  upload?: boolean;
};

// Keep in step with src/routes/*.ts (paths include the /api/<resource> mount from src/index.ts)
const routes: Route[] = [
  { method: "post", path: "/api/auth/signup", tag: "Auth", summary: "Create an account", schema: auth.signUpSchema, auth: false },
  { method: "post", path: "/api/auth/signin", tag: "Auth", summary: "Sign in", schema: auth.loginSchema, auth: false },
  { method: "post", path: "/api/auth/verify-email", tag: "Auth", summary: "Verify an email address", schema: auth.verifyEmailSchema, auth: false },
  { method: "post", path: "/api/auth/resend-verify-email", tag: "Auth", summary: "Resend the verification email", schema: auth.resendEmailVerificationSchema, auth: false },
  { method: "post", path: "/api/auth/forgot-password", tag: "Auth", summary: "Send a password reset email", schema: auth.forgotPasswordSchema, auth: false },
  { method: "patch", path: "/api/auth/reset-password", tag: "Auth", summary: "Reset a password", schema: auth.resetPasswordSchema, auth: false },
  { method: "post", path: "/api/auth/access-token", tag: "Auth", summary: "Exchange a refresh token for a new access token", schema: auth.refreshTokenSchema, auth: false },
  { method: "post", path: "/api/auth/logout", tag: "Auth", summary: "Sign out", schema: auth.logoutSchema },
  { method: "get", path: "/api/auth/me", tag: "Auth", summary: "Get my profile" },
  { method: "patch", path: "/api/auth/me", tag: "Auth", summary: "Update my profile", schema: auth.updateProfileSchema },

  { method: "get", path: "/api/wedding", tag: "Weddings", summary: "List my weddings", schema: wedding.getAllUserWeddingsSchema },
  { method: "post", path: "/api/wedding", tag: "Weddings", summary: "Create a wedding", schema: wedding.addNewWeddingSchema },
  { method: "get", path: "/api/wedding/:id", tag: "Weddings", summary: "Get a wedding", schema: wedding.getUserWeddingSchema },
  { method: "get", path: "/api/wedding/:id/dashboard", tag: "Weddings", summary: "Dashboard stats, recent RSVPs and breakdowns", schema: wedding.getUserWeddingSchema },
  { method: "get", path: "/api/wedding/:id/live", tag: "Weddings", summary: "Live RSVP stream (server-sent events)", schema: wedding.getUserWeddingSchema, response: "event-stream" },
  { method: "patch", path: "/api/wedding/:id", tag: "Weddings", summary: "Update a wedding", schema: wedding.editWeddingSchema },
  { method: "delete", path: "/api/wedding/:id", tag: "Weddings", summary: "Delete a wedding", schema: wedding.getUserWeddingSchema },

  { method: "get", path: "/api/event", tag: "Events", summary: "List a wedding's events", schema: event.getAllWeddingEventsSchema },
  { method: "post", path: "/api/event", tag: "Events", summary: "Create an event", schema: event.addNewWeddingEventSchema },
  { method: "get", path: "/api/event/:id", tag: "Events", summary: "Get an event", schema: event.getWeddingEventSchema },
  { method: "patch", path: "/api/event/:id", tag: "Events", summary: "Update an event", schema: event.editWeddingEventSchema },
  { method: "delete", path: "/api/event/:id", tag: "Events", summary: "Delete an event", schema: event.getWeddingEventSchema },

  { method: "get", path: "/api/guest", tag: "Guests", summary: "List guests (paginated, filterable)", schema: guest.getAllGuestsSchema },
  { method: "get", path: "/api/guest/export", tag: "Guests", summary: "Export guests as Excel", schema: guest.getAllGuestsSchema, response: "xlsx" },
  { method: "get", path: "/api/guest/:id", tag: "Guests", summary: "Get a guest with their event invites", schema: guest.getWeddingGuestSchema },
  { method: "get", path: "/api/guest/template/download/:id", tag: "Guests", summary: "Download the guest import template for a wedding", schema: guest.downloadGuestTemplateSchema, response: "xlsx" },
  { method: "post", path: "/api/guest/template/upload/:id", tag: "Guests", summary: "Import guests from the Excel template (queued; poll import-status)", schema: guest.uploadGuestTemplateSchema, upload: true },
  { method: "post", path: "/api/guest", tag: "Guests", summary: "Add a guest", schema: guest.addNewGuestSchema },
  { method: "patch", path: "/api/guest/:id", tag: "Guests", summary: "Update a guest", schema: guest.editWeddingGuestSchema },
  { method: "delete", path: "/api/guest/:id", tag: "Guests", summary: "Delete a guest", schema: guest.getWeddingGuestSchema },
  { method: "get", path: "/api/guest/import-status/:jobId", tag: "Guests", summary: "Status of a background guest job", schema: guest.getJobStatusSchema },

  { method: "get", path: "/api/guest/invites/whatsapp", tag: "Invites & reminders", summary: "RSVP and WhatsApp links for an event's or a guest's invites", schema: guest.getWhatsAppInvitesSchema },
  { method: "post", path: "/api/guest/invites/:inviteId/mark-sent", tag: "Invites & reminders", summary: "Record that an invite was sent", schema: guest.markInviteSentSchema },
  { method: "get", path: "/api/guest/invites/reminders", tag: "Invites & reminders", summary: "Reminders due now for an event", schema: guest.getDueRemindersSchema },
  { method: "post", path: "/api/guest/invites/:inviteId/mark-reminded", tag: "Invites & reminders", summary: "Record that a reminder was sent", schema: guest.markReminderSentSchema },

  { method: "get", path: "/api/rsvp/:token", tag: "RSVP", summary: "Get an invitation by its RSVP link token", schema: rsvp.getRsvpSchema, auth: false },
  { method: "put", path: "/api/rsvp/:token", tag: "RSVP", summary: "Submit a guest's reply by RSVP link token", schema: rsvp.submitRsvpSchema, auth: false },
  { method: "put", path: "/api/rsvp/invite/:inviteId", tag: "RSVP", summary: "Set a guest's reply from the host portal (ignores the RSVP deadline)", schema: rsvp.submitGuestRsvpSchema },

  { method: "get", path: "/api/page-setting/pages/:weddingId", tag: "RSVP page settings", summary: "Events with their RSVP page settings", schema: inviteFormat.getEventInviteFormatsByWeddingSchema },
  { method: "get", path: "/api/page-setting/:id", tag: "RSVP page settings", summary: "Get RSVP page settings by id", schema: inviteFormat.getEventInviteFormatSchema },
  { method: "get", path: "/api/page-setting/event/:eventId", tag: "RSVP page settings", summary: "Get RSVP page settings for an event", schema: inviteFormat.getEventInviteFormatByeventSchema },
  { method: "patch", path: "/api/page-setting/:id", tag: "RSVP page settings", summary: "Update RSVP page settings (the RSVP deadline is copied onto every invite)", schema: inviteFormat.updateEventInviteFormatSchema },
  { method: "post", path: "/api/page-setting/generate-image", tag: "RSVP page settings", summary: "Generate the RSVP page illustration", schema: inviteFormat.generateEventInviteFormatImageSchema },

  { method: "get", path: "/api/ai-invite-card/cards/:weddingId", tag: "AI invite cards", summary: "Events with their AI invite cards", schema: aiInviteCard.getAiInvitecardsByWeddingSchema },
  { method: "get", path: "/api/ai-invite-card/:id/generation-status", tag: "AI invite cards", summary: "Generation status of an AI invite card", schema: aiInviteCard.getAiInviteCardGenerationStatusSchema },
  { method: "patch", path: "/api/ai-invite-card/:id", tag: "AI invite cards", summary: "Update an AI invite card", schema: aiInviteCard.updateAiInviteCardSchema },
  { method: "post", path: "/api/ai-invite-card/generate-invite", tag: "AI invite cards", summary: "Queue AI invite card generation (rate limited)", schema: aiInviteCard.generateAIInviteCardImageSchema },

  { method: "post", path: "/api/general/generate-upload-url", tag: "Files", summary: "Presigned S3 upload URL", schema: general.generateS3PresignedUploadURLSchema },
  { method: "post", path: "/api/general/generate-view-url", tag: "Files", summary: "Presigned S3 view URL for an object key", schema: general.generateS3PresignedViewURLSchema },
];

type JsonSchema = Record<string, unknown> & {
  properties?: Record<string, Record<string, unknown>>;
  required?: string[];
};

// Documents what clients send, so transforms and coercions use their input side
const toJsonSchema = (schema: z.ZodType): JsonSchema => {
  const { $schema: _dialect, ...rest } = z.toJSONSchema(schema, {
    io: "input",
    unrepresentable: "any",
  }) as JsonSchema;
  return rest;
};

const toParameters = (part: z.ZodType | undefined, location: "path" | "query") => {
  if (!part) return [];
  const { properties = {}, required = [] } = toJsonSchema(part);
  return Object.entries(properties).map(([name, schema]) => ({
    name,
    in: location,
    required: location === "path" || required.includes(name),
    ...(typeof schema.description === "string" && { description: schema.description }),
    schema,
  }));
};

const json = (schema: object) => ({ "application/json": { schema } });

const successResponse = (kind: Route["response"] = "json") => {
  if (kind === "xlsx") {
    return {
      description: "Excel workbook",
      content: {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
          schema: { type: "string", format: "binary" },
        },
      },
    };
  }
  if (kind === "event-stream") {
    return {
      description:
        "Server-sent events: `event: rsvp` with a LiveRsvp JSON payload per reply, plus `: ping` heartbeats every 25s",
      content: { "text/event-stream": { schema: { type: "string" } } },
    };
  }
  return { description: "Success", content: json({ $ref: "#/components/schemas/SuccessResponse" }) };
};

const paths: Record<string, Record<string, unknown>> = {
  "/health": {
    get: {
      tags: ["System"],
      summary: "Health check",
      responses: { "200": { description: "OK", content: json({ type: "object" }) } },
    },
  },
};

for (const route of routes) {
  const shape = (route.schema?.shape ?? {}) as Record<string, z.ZodType | undefined>;
  const requiresAuth = route.auth ?? true;

  const requestBody = route.upload
    ? {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["file"],
              properties: { file: { type: "string", format: "binary", description: "Filled-in guest template (.xlsx)" } },
            },
          },
        },
      }
    : shape.body
      ? { required: true, content: json(toJsonSchema(shape.body)) }
      : undefined;

  const openApiPath = route.path.replace(/:(\w+)/g, "{$1}");
  paths[openApiPath] ??= {};
  paths[openApiPath][route.method] = {
    tags: [route.tag],
    summary: route.summary,
    ...(requiresAuth && { security: [{ bearerAuth: [] }] }),
    parameters: [...toParameters(shape.params, "path"), ...toParameters(shape.query, "query")],
    ...(requestBody && { requestBody }),
    responses: {
      "2XX": successResponse(route.response),
      "400": { $ref: "#/components/responses/ValidationError" },
      ...(requiresAuth && { "401": { $ref: "#/components/responses/Unauthorized" } }),
      "404": { $ref: "#/components/responses/NotFound" },
    },
  };
}

const errorContent = json({ $ref: "#/components/schemas/ErrorResponse" });

const document = {
  openapi: "3.1.0",
  info: {
    title: "AI Wedding RSVP Generator API",
    version: "1.0.0",
    description:
      "Host portal API (Bearer access token from /api/auth/signin) plus the public guest RSVP endpoints, which use the invite token from the RSVP link. Generated by scripts/generate-openapi.ts.",
  },
  servers: [{ url: "http://localhost:3000", description: "Local API" }],
  paths,
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", const: true },
          statusCode: { type: "integer" },
          message: { type: "string" },
          data: {},
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", const: false },
          message: { type: "string" },
          errors: { type: "array", items: {} },
        },
      },
    },
    responses: {
      ValidationError: { description: "Invalid request: the first problem is in `message`, all of them in `errors`", content: errorContent },
      Unauthorized: { description: "Missing or expired access token", content: errorContent },
      NotFound: { description: "Not found, or not owned by the signed-in user", content: errorContent },
    },
  },
};

writeFileSync(
  path.join(__dirname, "../src/openapi.json"),
  `${JSON.stringify(document, null, 2)}\n`,
);
console.log(`Wrote ${routes.length + 1} operations to src/openapi.json`);
