// End-to-end check of PATCH /api/auth/change-password against the running API (npm run dev)
// and its database. Creates a throwaway verified user and deletes it afterwards.
// ponytail: needs a live server + DB + Redis; boot the app in-process if this ever runs in CI
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import { prisma } from "../src/lib/prisma";

const API = process.env.TEST_API_URL ?? `http://localhost:${process.env.PORT ?? 3000}/api`;
const email = `change-password-${Date.now()}@e2e.test`;
const OLD_PASSWORD = "Old-passw0rd!";
const NEW_PASSWORD = "New-passw0rd!";

const call = async (
  method: string,
  path: string,
  body: Record<string, unknown>,
  token?: string,
) => {
  const res = await fetch(`${API}/auth/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as any };
};

const signIn = (password: string) => call("POST", "signin", { email, password });

let access: string;
let refresh: string;

before(async () => {
  await prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash(OLD_PASSWORD, 10),
      first_name: "E2E",
      last_name: "Test",
      mobile_number: "0000000000",
      is_email_verified: true,
    },
  });

  const { status, json } = await signIn(OLD_PASSWORD);
  assert.equal(status, 200);
  access = json.data.tokens.access.token;
  refresh = json.data.tokens.refresh.token;
});

after(async () => {
  // Tokens cascade with the user
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

test("rejects a request with no access token", async () => {
  const { status } = await call("PATCH", "change-password", {
    currentPassword: OLD_PASSWORD,
    newPassword: NEW_PASSWORD,
  });
  assert.equal(status, 401);
});

test("rejects a wrong current password with 400, not 401", async () => {
  const { status, json } = await call(
    "PATCH",
    "change-password",
    { currentPassword: "Wrong-passw0rd!", newPassword: NEW_PASSWORD },
    access,
  );
  assert.equal(status, 400);
  assert.equal(json.message, "Current password is incorrect");
});

test("rejects a new password equal to the current one", async () => {
  const { status } = await call(
    "PATCH",
    "change-password",
    { currentPassword: OLD_PASSWORD, newPassword: OLD_PASSWORD },
    access,
  );
  assert.equal(status, 400);
});

test("rejects a new password outside 8-20 characters", async () => {
  for (const newPassword of ["Sh0rt!", "A1!" + "a".repeat(18)]) {
    const { status } = await call(
      "PATCH",
      "change-password",
      { currentPassword: OLD_PASSWORD, newPassword },
      access,
    );
    assert.equal(status, 400, newPassword);
  }
});

test("the failed attempts above changed nothing", async () => {
  assert.equal((await signIn(OLD_PASSWORD)).status, 200);
});

test("changes the password, ends every other session and returns a working one", async () => {
  const { status, json } = await call(
    "PATCH",
    "change-password",
    { currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD },
    access,
  );
  assert.equal(status, 200);
  assert.equal(JSON.stringify(json).includes("$2"), false, "no password hash in the response");

  // The tokens that made the request are gone
  assert.equal((await call("POST", "access-token", { refreshToken: refresh })).status, 401);
  assert.equal(
    (await call("PATCH", "change-password", { currentPassword: NEW_PASSWORD, newPassword: OLD_PASSWORD }, access)).status,
    401,
  );

  // The pair it returned works
  const fresh = json.data;
  const me = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${fresh.access.token}` },
  });
  assert.equal(me.status, 200);
  assert.equal((await call("POST", "access-token", { refreshToken: fresh.refresh.token })).status, 200);

  assert.equal((await signIn(OLD_PASSWORD)).status, 401);
  assert.equal((await signIn(NEW_PASSWORD)).status, 200);
});
