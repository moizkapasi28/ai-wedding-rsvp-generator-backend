// Self-check for the profile update and token error paths against the local DB (creates and
// deletes a throwaway user). Run from the backend root: npx tsx src/utils/auth.check.ts
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import { TOKEN_TYPE } from "../enums/token.enum";
import { prisma } from "../lib/prisma";
import {
  forgotPasswordService,
  logoutService,
  resetPasswordService,
  signInService,
  updateProfileService,
  userProfileService,
} from "../services/auth.service";
import {
  generateResetPasswordTokenService,
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

    console.log("auth checks passed");
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
};

main();
