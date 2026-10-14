import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWhatsAppLink, normalizePhone } from "./whatsapp";

process.env.WHATSAPP_DEFAULT_COUNTRY_CODE = "91";

test("a local number gets the default country code", () => {
  assert.equal(normalizePhone("98765 43210"), "919876543210");
  assert.equal(normalizePhone("098765-43210"), "919876543210");
});

test("a number typed with + keeps its own country code", () => {
  assert.equal(normalizePhone("+1 (415) 555-0123"), "14155550123");
  assert.equal(normalizePhone("+44 7700 900123"), "447700900123");
});

test("a longer number without + is taken to include its country code", () => {
  assert.equal(normalizePhone("919876543210"), "919876543210");
});

test("too short, empty or missing is not a number", () => {
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone(""), null);
  assert.equal(normalizePhone(null), null);
});

test("the link carries the message, encoded", () => {
  assert.equal(buildWhatsAppLink("919876543210", "Hi & bye"), "https://wa.me/919876543210?text=Hi%20%26%20bye");
});
