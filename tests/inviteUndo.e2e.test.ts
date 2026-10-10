// End-to-end check of undoing "mark sent" / "mark reminded" (DELETE on the same paths as the
// POSTs) against the running API (npm run dev) and its database. Creates two throwaway
// verified users, with a wedding, an event and a guest for the first, and deletes them afterwards.
// ponytail: needs a live server + DB + Redis; boot the app in-process if this ever runs in CI
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { prisma } from "../src/lib/prisma";

const API = process.env.TEST_API_URL ?? `http://localhost:${process.env.PORT ?? 3000}/api`;
const stamp = Date.now();
const emails = [`invite-undo-${stamp}@e2e.test`, `invite-undo-other-${stamp}@e2e.test`];
const PASSWORD = "Undo-passw0rd!";
const GUEST_NAME = `Undo Guest ${stamp}`;

const call = async (method: string, path: string, token?: string, body?: unknown) => {
  const res = await fetch(`${API}/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  return { status: res.status, json: (await res.json()) as any };
};

const signIn = async (email: string) => {
  const { status, json } = await call("POST", "auth/signin", undefined, { email, password: PASSWORD });
  assert.equal(status, 200);
  return json.data.tokens.access.token as string;
};

let owner: string;
let stranger: string;
let weddingId: string;
let eventId: string;
let inviteId: string;

const invite = async () => {
  const { json } = await call("GET", `guest/invites/whatsapp?eventId=${eventId}`, owner);
  return json.data.find((i: any) => i.id === inviteId);
};

// Whether the guest shows up under the guest list's "invite not sent" filter
const listedAsNotSent = async () => {
  const { status, json } = await call("GET", `guest?weddingId=${weddingId}&inviteSent=not_sent`, owner);
  assert.equal(status, 200);
  return JSON.stringify(json.data).includes(GUEST_NAME);
};

before(async () => {
  const password = await bcrypt.hash(PASSWORD, 10);
  for (const email of emails) {
    await prisma.user.create({
      data: { email, password, first_name: "E2E", last_name: "Test", mobile_number: "0000000000", is_email_verified: true },
    });
  }
  owner = await signIn(emails[0]);
  stranger = await signIn(emails[1]);

  const place = { date: "2030-03-28", venue: "Hall", address: "1 Road", city: "Ahmedabad" };
  const wedding = await call("POST", "wedding", owner, { ...place, title: "Undo wedding", bride_name: "A", groom_name: "B" });
  assert.equal(wedding.status, 201, JSON.stringify(wedding.json));
  weddingId = wedding.json.data.id;

  const event = await call("POST", "event", owner, { ...place, weddingId, title: "Sangeet", description: "d", time: "18:00", event_side: "BOTH" });
  assert.equal(event.status, 201, JSON.stringify(event.json));
  eventId = event.json.data.id;

  const guest = await call("POST", "guest", owner, {
    eventIds: [eventId], name: GUEST_NAME, mobile_number: "9876512345", side: "BRIDE", group: "FRIEND", accomodation_required: false,
  });
  assert.equal(guest.status, 201, JSON.stringify(guest.json));

  inviteId = (await prisma.guestEventInvite.findFirstOrThrow({ where: { event_id: eventId } })).id;
});

after(async () => {
  // Weddings, events, guests, invites and tokens cascade with the user
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.$disconnect();
});

test("a new invite is unsent", async () => {
  assert.equal((await invite()).invite_sent_at, null);
  assert.equal(await listedAsNotSent(), true);
});

test("the undo endpoints need a signed-in user", async () => {
  assert.equal((await call("DELETE", `guest/invites/${inviteId}/mark-sent`)).status, 401);
  assert.equal((await call("DELETE", `guest/invites/${inviteId}/mark-reminded?reminder=FIRST`)).status, 401);
});

test("mark sent, then undo: the invite is unsent again and back under the not-sent filter", async () => {
  assert.equal((await call("POST", `guest/invites/${inviteId}/mark-sent`, owner, {})).status, 200);
  assert.notEqual((await invite()).invite_sent_at, null);
  assert.equal(await listedAsNotSent(), false);

  const undo = await call("DELETE", `guest/invites/${inviteId}/mark-sent`, owner);
  assert.equal(undo.status, 200);
  assert.equal(undo.json.data.invite_sent_at, null);
  assert.equal((await invite()).invite_sent_at, null);
  assert.equal(await listedAsNotSent(), true);

  // Undoing twice is harmless
  assert.equal((await call("DELETE", `guest/invites/${inviteId}/mark-sent`, owner)).status, 200);
});

test("mark reminded, then undo: only the named reminder is cleared", async () => {
  for (const reminder of ["FIRST", "FINAL"]) {
    assert.equal((await call("POST", `guest/invites/${inviteId}/mark-reminded`, owner, { reminder })).status, 200);
  }

  const undo = await call("DELETE", `guest/invites/${inviteId}/mark-reminded?reminder=FIRST`, owner);
  assert.equal(undo.status, 200);
  assert.equal(undo.json.data.first_reminder_sent_at, null);
  assert.notEqual(undo.json.data.final_reminder_sent_at, null);

  const undoFinal = await call("DELETE", `guest/invites/${inviteId}/mark-reminded?reminder=FINAL`, owner);
  assert.equal(undoFinal.json.data.final_reminder_sent_at, null);
});

test("undoing a reminder without saying which one is a 400", async () => {
  assert.equal((await call("DELETE", `guest/invites/${inviteId}/mark-reminded`, owner)).status, 400);
  assert.equal((await call("DELETE", `guest/invites/${inviteId}/mark-reminded?reminder=SECOND`, owner)).status, 400);
});

test("another user's invite is a 404, and stays as it was", async () => {
  await call("POST", `guest/invites/${inviteId}/mark-sent`, owner, {});

  assert.equal((await call("DELETE", `guest/invites/${inviteId}/mark-sent`, stranger)).status, 404);
  assert.equal((await call("DELETE", `guest/invites/${inviteId}/mark-reminded?reminder=FIRST`, stranger)).status, 404);
  assert.notEqual((await invite()).invite_sent_at, null);
});

test("the profile carries the AI credit costs next to the balance, on GET and PATCH", async () => {
  const me = await call("GET", "auth/me", owner);
  assert.equal(me.status, 200);
  assert.equal(typeof me.json.data.ai_credits, "number");
  assert.deepEqual(me.json.data.ai_credit_costs, { INVITE_CARD: 10, HEADER_IMAGE: 5 });

  const updated = await call("PATCH", "auth/me", owner, { firstName: "Renamed" });
  assert.equal(updated.status, 200);
  assert.deepEqual(Object.keys(updated.json.data).sort(), Object.keys(me.json.data).sort());
  assert.equal("password" in updated.json.data, false);
});
