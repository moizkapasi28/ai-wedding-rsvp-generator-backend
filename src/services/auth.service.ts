import { TokenType, User } from "../../generated/prisma/browser";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserById,
} from "../repositories/user.repository";
import { deleteTokenByJti } from "../repositories/token.repository";
import { TOKEN_TYPE } from "../enums/token.enum";
import { ApiError } from "../utils/apiError.util";
import {
  ForgotPasswordDto,
  LoginDto,
  ResendEmailVerificationDto,
  ResetPasswordDto,
  SignUpDto,
  VerifyEmailDto,
} from "../validations/auth.validation";
import bcrypt from "bcrypt";
import {
  generateAuthTokensService,
  generateResetPasswordTokenService,
  generateVerifyEmailTokenService,
  verifyTokenService,
} from "./token.service";
import { sendEmail } from "./email.service";
import {
  USER_EMAIL_VERIFICATION_TEMPLATE,
  USER_EMAIL_VERIFIED_TEMPLATE,
  USER_FORGOT_PASSWORD_TEMPLATE,
  USER_RESET_PASSWORD_TEMPLATE,
} from "../utils/constants/email.constant";
import { prisma } from "../lib/prisma";
import { Token } from "../../generated/prisma/client";

export const signUpService = async (
  payload: SignUpDto,
): Promise<Omit<User, "password">> => {
  return prisma.$transaction(async (tx) => {
    const { email, password, first_name, last_name, mobile_number } = payload;
    const exitingUser = await findUserByEmail(email, tx);

    if (exitingUser) throw new ApiError(409, "User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);

    //Create new user
    const newUser = await createUser(
      {
        email,
        password: hashedPassword,
        first_name,
        last_name,
        mobile_number,
      },
      tx,
    );

    //Send email for email verification
    const verifyEmailToken = await generateVerifyEmailTokenService(
      newUser.id,
      tx,
    );

    await sendEmail(USER_EMAIL_VERIFICATION_TEMPLATE, {
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      token: verifyEmailToken,
    });

    const { password: _password, ...user } = newUser;
    return user;
  });
};

export const signInService = async (
  payload: LoginDto,
): Promise<
  Omit<User, "password"> & {
    tokens: {
      access: { token: string; expires_at: Date };
      refresh: { token: string; expires_at: Date };
    };
  }
> => {
  const { email, password } = payload;

  const existingUser = await findUserByEmail(email);

  if (!existingUser) throw new ApiError(404, "Invalid email or password");

  const isPasswordValid = await bcrypt.compare(password, existingUser.password);

  if (!isPasswordValid) throw new ApiError(404, "Invalid email or password");

  const tokens = await generateAuthTokensService(existingUser);

  const { password: _password, ...user } = existingUser;

  return {
    ...user,
    tokens: tokens,
  };
};

export const verifyEmailService = async (
  payload: VerifyEmailDto,
): Promise<boolean> => {
  const { token } = payload;

  return prisma.$transaction(async (tx) => {
    let tokenDoc: Token;
    try {
      tokenDoc = await verifyTokenService(
        token,
        TOKEN_TYPE.EMAIL_VERIFICATION,
        tx,
      );
    } catch (error: any) {
      throw new ApiError(401, "Invalid link or link has expired");
    }

    const user = await findUserById(tokenDoc.user_id, tx);
    if (!user) throw new ApiError(404, "User not found");

    if (user.is_email_verified) return true;

    await updateUserById(user.id, { is_email_verified: true }, tx);
    await deleteTokenByJti(tokenDoc.jti, tx);

    await sendEmail(USER_EMAIL_VERIFIED_TEMPLATE, {
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
    });

    return true;
  });
};

export const resendVerificationEmailService = async (
  payload: ResendEmailVerificationDto,
): Promise<void> => {
  const { email } = payload;

  return prisma.$transaction(async (tx) => {
    const user = await findUserByEmail(email, tx);

    if (!user) return;

    const verifyEmailToken = await generateVerifyEmailTokenService(user.id, tx);

    await sendEmail(USER_EMAIL_VERIFICATION_TEMPLATE, {
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      token: verifyEmailToken,
    });
  });
};

export const forgotPasswordService = async (
  payload: ForgotPasswordDto,
): Promise<void> => {
  const { email } = payload;

  return prisma.$transaction(async (tx) => {
    const user = await findUserByEmail(email, tx);
    if (!user) return;

    const resetPasswordToken = await generateResetPasswordTokenService(
      user.id,
      tx,
    );
    await sendEmail(USER_FORGOT_PASSWORD_TEMPLATE, {
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      token: resetPasswordToken,
    });
  });
};

export const resetPasswordService = async (
  payload: ResetPasswordDto,
): Promise<void> => {
  const { token, newPassword } = payload;

  return prisma.$transaction(async (tx) => {
    let tokenDoc: Token;
    try {
      tokenDoc = await verifyTokenService(token, TOKEN_TYPE.RESET_PASSWORD, tx);
    } catch (error: any) {
      throw new ApiError(401, "Invalid link or link has expired");
    }

    const user = await findUserById(tokenDoc.user_id, tx);
    if (!user) throw new ApiError(404, "User not found");

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateUserById(
      user.id,
      { password: hashedPassword, updated_at: new Date() },
      tx,
    );
    await deleteTokenByJti(tokenDoc.jti, tx);
  });
};
