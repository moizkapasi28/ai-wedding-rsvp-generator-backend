import assert from "node:assert/strict";
import { test } from "node:test";
import { buildRsvpUpdate, type RsvpFormat } from "./rsvp.util";

const now = new Date("2026-10-14T12:00:00Z");
const allOn: RsvpFormat = { dietary_preference: true, plus_ones: true, song_request: true, message: true };
const reply = { status: "ATTENDING", plus_ones: 2, dietary: "VEGAN", song_request: "a song", message: "hi" } as const;

test("a reply before the deadline is saved with the time it was given", () => {
  const update = buildRsvpUpdate({ invite_deadline: new Date("2026-10-20") }, allOn, reply, now);
  assert.deepEqual(update, { ...reply, responded_at: now });
});

test("a reply after the deadline is refused with 409", () => {
  assert.throws(
    () => buildRsvpUpdate({ invite_deadline: new Date("2026-10-13") }, allOn, reply, now),
    { statusCode: 409 },
  );
});

test("no deadline means replies stay open", () => {
  assert.equal(buildRsvpUpdate({ invite_deadline: null }, allOn, reply, now).status, "ATTENDING");
});

test("answers to questions the host switched off are dropped", () => {
  const update = buildRsvpUpdate(
    { invite_deadline: null },
    { dietary_preference: false, plus_ones: true, song_request: false, message: true },
    reply,
    now,
  );
  assert.deepEqual(update, { status: "ATTENDING", responded_at: now, plus_ones: 2, message: "hi" });
});
