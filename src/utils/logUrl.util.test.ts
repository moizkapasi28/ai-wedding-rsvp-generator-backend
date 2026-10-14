import assert from "node:assert/strict";
import { test } from "node:test";
import { redactUrlForLog } from "./logUrl.util";

const token = "026c460c-a297-4305-a63d-ac6238597b6a";

test("the RSVP link token is replaced, with or without a query string", () => {
  assert.equal(redactUrlForLog(`/api/rsvp/${token}`), "/api/rsvp/[token]");
  assert.equal(redactUrlForLog(`/api/rsvp/${token}?x=1`), "/api/rsvp/[token]?x=1");
});

test("the host route and every other URL are left as they are", () => {
  assert.equal(redactUrlForLog(`/api/rsvp/invite/${token}`), `/api/rsvp/invite/${token}`);
  assert.equal(redactUrlForLog(`/api/guest/${token}`), `/api/guest/${token}`);
  assert.equal(redactUrlForLog("/health"), "/health");
});
