import assert from "node:assert/strict";
import { test } from "node:test";
import { getDueReminder } from "./reminder.util";

const DAY = 86_400_000;
const now = new Date("2026-10-14T12:00:00Z");
const daysFromNow = (days: number) => new Date(now.getTime() + days * DAY);

const invite = (overrides: Partial<Parameters<typeof getDueReminder>[0]> = {}) => ({
  status: "PENDING",
  invite_sent_at: daysFromNow(-8),
  invite_deadline: daysFromNow(20),
  first_reminder_sent_at: null,
  final_reminder_sent_at: null,
  ...overrides,
});
const bothOn = { first_reminder: true, final_reminder: true };

test("the first reminder is due 7 days after the invite was sent, not before", () => {
  assert.equal(getDueReminder(invite({ invite_sent_at: daysFromNow(-7) }), bothOn, now), "FIRST");
  assert.equal(getDueReminder(invite({ invite_sent_at: daysFromNow(-6.9) }), bothOn, now), null);
});

test("the final reminder is due within 3 days of the deadline, and wins over the first", () => {
  assert.equal(getDueReminder(invite({ invite_deadline: daysFromNow(3) }), bothOn, now), "FINAL");
  assert.equal(getDueReminder(invite({ invite_deadline: daysFromNow(3.1) }), bothOn, now), "FIRST");
});

test("nothing is due once the deadline has passed", () => {
  assert.equal(getDueReminder(invite({ invite_deadline: daysFromNow(-1) }), bothOn, now), null);
});

test("nothing is due for a guest who replied or was never sent the invite", () => {
  assert.equal(getDueReminder(invite({ status: "ATTENDING" }), bothOn, now), null);
  assert.equal(getDueReminder(invite({ invite_sent_at: null }), bothOn, now), null);
});

test("a reminder switched off in the page settings is never due", () => {
  assert.equal(getDueReminder(invite(), { first_reminder: false, final_reminder: true }, now), null);
  assert.equal(
    getDueReminder(invite({ invite_deadline: daysFromNow(2) }), { first_reminder: true, final_reminder: false }, now),
    "FIRST",
  );
});

test("each reminder is due once, and the first is skipped after the final has gone out", () => {
  assert.equal(getDueReminder(invite({ first_reminder_sent_at: daysFromNow(-1) }), bothOn, now), null);
  assert.equal(
    getDueReminder(invite({ invite_deadline: daysFromNow(2), final_reminder_sent_at: daysFromNow(-1) }), bothOn, now),
    null,
  );
});
