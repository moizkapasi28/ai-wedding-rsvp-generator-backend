// Self-check for the profile update and token error paths against the local DB (creates and
// deletes a throwaway user). Run from the backend root: npx tsx src/utils/auth.check.ts
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import moment from "moment";
import { TOKEN_TYPE } from "../enums/token.enum";
import { prisma } from "../lib/prisma";
import {
  forgotPasswordService,
  logoutService,
  refreshTokenService,
  resetPasswordService,
  signInService,
  updateProfileService,
  userProfileService,
} from "../services/auth.service";
import {
  generateResetPasswordTokenService,
  generateTokenService,
  saveTokenService,
  verifyTokenService,
} from "../services/token.service";
import { userPrefix } from "./imageKeyOwnership.util";

const main = async () => {
  const password = "Right-pass-1";
  const user = await prisma.user.create({
    data: {
      first_name: "Auth",
      last_name: "Check",
      email: `auth-check-${Date.now()}@example.test`,
      mobile_number: "0",
      password: await bcrypt.hash(password, 4),
    },
  });

  try {
    // The update response is the GET /auth/me shape: no password hash
    const updated = await updateProfileService(user.id, { first_name: "New" });
    assert.equal(updated.first_name, "New");
    assert.equal("password" in updated, false);
    assert.deepEqual(
      Object.keys(updated).sort(),
      Object.keys(await userProfileService(user.id)).sort(),
    );

    // A key under someone else's prefix is rejected and not saved
    await assert.rejects(
      updateProfileService(user.id, {
        profile_picture: "users/someone-else/photo.png",
      }),
      { statusCode: 400 },
    );
    assert.equal((await userProfileService(user.id)).profile_picture, null);

    // The caller's own upload saves, and null clears it
    const ownKey = `${userPrefix(user.id)}photo.png`;
    const saved = await updateProfileService(user.id, {
      profile_picture: ownKey,
    });
    assert.equal(saved.profile_picture, ownKey);
    const cleared = await updateProfileService(user.id, {
      profile_picture: null,
    });
    assert.equal(cleared.profile_picture, null);

    // A bad token is a 401, not a plain Error (which the error middleware turns into a 500)
    await assert.rejects(verifyTokenService("garbage", TOKEN_TYPE.REFRESH), {
      statusCode: 401,
    });
    // ...and logging out with one is a no-op, not an error
    await logoutService({ refreshToken: "garbage" });

    // Wrong password on an unverified account: the generic 401, and no verification token
    // is created (so no email goes out)
    await assert.rejects(
      signInService({ email: user.email, password: "wrong" }),
      { statusCode: 401 },
    );
    assert.equal(await prisma.token.count({ where: { user_id: user.id } }), 0);

    // A password reset ends every existing session
    await prisma.user.update({
      where: { id: user.id },
      data: { is_email_verified: true },
    });
    const { tokens } = await signInService({ email: user.email, password });
    const resetToken = await generateResetPasswordTokenService(user.id);
    await resetPasswordService({ token: resetToken, newPassword: "New-pass-2" });
    await assert.rejects(
      verifyTokenService(tokens.refresh.token, TOKEN_TYPE.REFRESH),
      { statusCode: 401 },
    );
    await assert.rejects(signInService({ email: user.email, password }), {
      statusCode: 401,
    });
    await signInService({ email: user.email, password: "New-pass-2" });

    // Forgot-password for an unknown email resolves quietly instead of throwing
    await forgotPasswordService({ email: `nobody-${Date.now()}@example.test` });

    // Sessions are per device. Two sign-ins, plus a reset link and an expired row from before them
    const credentials = { email: user.email, password: "New-pass-2" };
    const isValid = (token: string, type: TOKEN_TYPE) =>
      verifyTokenService(token, type).then(
        () => true,
        () => false,
      );
    const earlierResetLink = await generateResetPasswordTokenService(user.id);
    const expired = await prisma.token.create({
      data: {
        jti: "00000000-0000-4000-8000-000000000000",
        user_id: user.id,
        token_type: "ACCESS",
        expires_at: new Date(Date.now() - 1000),
      },
    });
    const laptop = (await signInService(credentials)).tokens;
    const phone = (await signInService(credentials)).tokens;

    // A sign-in keeps the other session and a pending reset link, and sweeps expired rows
    assert.equal(await isValid(laptop.refresh.token, TOKEN_TYPE.REFRESH), true);
    assert.equal(
      await isValid(earlierResetLink, TOKEN_TYPE.RESET_PASSWORD),
      true,
    );
    assert.equal(await prisma.token.count({ where: { id: expired.id } }), 0);

    // Refreshing the laptop rotates its pair only; its old tokens are dead, the phone's are not
    const laptop2 = await refreshTokenService({
      refreshToken: laptop.refresh.token,
    });
    assert.equal(await isValid(laptop2.access.token, TOKEN_TYPE.ACCESS), true);
    assert.equal(await isValid(laptop.access.token, TOKEN_TYPE.ACCESS), false);
    assert.equal(await isValid(phone.access.token, TOKEN_TYPE.ACCESS), true);
    // ...and using the old refresh token a second time is a 401
    await assert.rejects(
      refreshTokenService({ refreshToken: laptop.refresh.token }),
      { statusCode: 401 },
    );

    // Two requests racing with the same refresh token: one wins, and its new pair survives
    const race = await Promise.allSettled([
      refreshTokenService({ refreshToken: laptop2.refresh.token }),
      refreshTokenService({ refreshToken: laptop2.refresh.token }),
    ]);
    const winners = race.filter((r) => r.status === "fulfilled");
    assert.equal(winners.length, 1);
    const laptop3 = (winners[0] as PromiseFulfilledResult<typeof laptop2>)
      .value;
    assert.equal(await isValid(laptop3.refresh.token, TOKEN_TYPE.REFRESH), true);

    // Signing out on the laptop leaves the phone signed in
    await logoutService({ refreshToken: laptop3.refresh.token });
    assert.equal(await isValid(laptop3.access.token, TOKEN_TYPE.ACCESS), false);
    assert.equal(await isValid(phone.refresh.token, TOKEN_TYPE.REFRESH), true);
    assert.equal(await isValid(phone.access.token, TOKEN_TYPE.ACCESS), true);

    // A refresh token issued before session_id existed (no session) still refreshes once,
    // without touching the phone
    const legacyJti = "11111111-1111-4111-8111-111111111111";
    const legacyExpiry = moment().add(1, "day");
    await saveTokenService(legacyJti, user.id, TOKEN_TYPE.REFRESH, legacyExpiry);
    const legacyRefresh = generateTokenService(user.id, legacyExpiry, legacyJti);
    const upgraded = await refreshTokenService({ refreshToken: legacyRefresh });
    assert.equal(await isValid(upgraded.access.token, TOKEN_TYPE.ACCESS), true);
    assert.equal(await isValid(legacyRefresh, TOKEN_TYPE.REFRESH), false);
    assert.equal(await isValid(phone.refresh.token, TOKEN_TYPE.REFRESH), true);

    console.log("auth checks passed");
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
};

main();
