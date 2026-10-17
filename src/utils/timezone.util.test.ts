import assert from "node:assert/strict";
import { test } from "node:test";
import { dayKeyIn, isValidTimezone, lastDaysIn } from "./timezone.util";

test("day keys follow the wedding's timezone, not the server's", () => {
  const instant = new Date("2030-03-21T06:59:59Z"); // end of 20 March in Los Angeles
  assert.equal(dayKeyIn(instant, "America/Los_Angeles"), "2030-03-20");
  assert.equal(dayKeyIn(instant, "Asia/Kolkata"), "2030-03-21");
});

test("the last 7 days end today in that timezone and start at its midnight", () => {
  const now = new Date("2030-03-21T03:00:00Z"); // still 20 March in Los Angeles
  const la = lastDaysIn("America/Los_Angeles", 7, now);
  assert.deepEqual(la.keys, ["2030-03-14", "2030-03-15", "2030-03-16", "2030-03-17", "2030-03-18", "2030-03-19", "2030-03-20"]);
  assert.equal(la.since.toISOString(), "2030-03-14T07:00:00.000Z"); // PDT, after the 10 March switch

  const india = lastDaysIn("Asia/Kolkata", 7, now);
  assert.equal(india.keys[6], "2030-03-21");
  assert.equal(india.since.toISOString(), "2030-03-14T18:30:00.000Z");
});

test("a window across a DST change still starts at local midnight", () => {
  const now = new Date("2030-03-12T12:00:00Z"); // two days after US clocks went forward
  const { keys, since } = lastDaysIn("America/New_York", 7, now);
  assert.equal(keys[0], "2030-03-06");
  assert.equal(since.toISOString(), "2030-03-06T05:00:00.000Z"); // EST that day
});

test("timezone names are checked", () => {
  assert.equal(isValidTimezone("America/Los_Angeles"), true);
  assert.equal(isValidTimezone("UTC"), true);
  assert.equal(isValidTimezone("Mars/Olympus_Mons"), false);
});
