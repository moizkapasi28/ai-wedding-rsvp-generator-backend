import bcrypt from "bcrypt";
import { User } from "../../generated/prisma/browser";
import { Token } from "../../generated/prisma/client";
import { TOKEN_TYPE } from "../enums/token.enum";
import { prisma } from "../lib/prisma";
import { deleteTokenByJti } from "../repositories/token.repository";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserById,
} from "../repositories/user.repository";
import { AuthResponseDto } from "../types/auth.type";
import { ApiError } from "../utils/apiError.util";
import {
  USER_EMAIL_VERIFICATION_TEMPLATE,
  USER_EMAIL_VERIFIED_TEMPLATE,
  USER_FORGOT_PASSWORD_TEMPLATE,
} from "../utils/constants/email.constant";
import {
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  ResendEmailVerificationDto,
  ResetPasswordDto,
  SignUpDto,
  VerifyEmailDto,
} from "../validations/auth.validation";
import { sendEmail } from "./email.service";
import {
  deleteTokensByUserIdService,
  generateAuthTokensService,
  generateResetPasswordTokenService,
  generateVerifyEmailTokenService,
  verifyTokenService,
} from "./token.service";

export const signUpService = async (
  payload: SignUpDto,
): Promise<Omit<User, "password">> => {
  const { newUser, verifyEmailToken } = await prisma.$transaction(
    async (tx) => {
      const {
        email,
        password,
        firstName: first_name,
        lastName: last_name,
        mobileNumber: mobile_number,
      } = payload;
      const exitingUser = await findUserByEmail(email, tx);

      if (exitingUser && exitingUser.is_email_verified)
        throw new ApiError(
          409,
          "User already associated with this email address",
        );

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

      const verifyEmailToken = await generateVerifyEmailTokenService(
        newUser.id,
        tx,
      );

      const { password: _password, ...user } = newUser;
      return {
        newUser: user,
        verifyEmailToken,
      };
    },
  );

  //Send email for email verification
  await sendEmail(USER_EMAIL_VERIFICATION_TEMPLATE, {
    email: newUser.email,
    first_name: newUser.first_name,
    last_name: newUser.last_name,
    token: verifyEmailToken,
  });

  return newUser;
};

export const signInService = async (
  payload: LoginDto,
): Promise<AuthResponseDto> => {
  const { email, password } = payload;

  const existingUser = await findUserByEmail(email);

  if (!existingUser) throw new ApiError(404, "Invalid email or password");

  if (!existingUser.is_email_verified) {
    const verifyEmailToken = await generateVerifyEmailTokenService(
      existingUser.id,
    );

    await sendEmail(USER_EMAIL_VERIFICATION_TEMPLATE, {
      email: existingUser.email,
      first_name: existingUser.first_name,
      last_name: existingUser.last_name,
      token: verifyEmailToken,
    });

    throw new ApiError(
      403,
      "Account verification is pending. A verification email has been sent to your email address.",
    );
  }

  const isPasswordValid = await bcrypt.compare(password, existingUser.password);

  if (!isPasswordValid) throw new ApiError(404, "Invalid email or password");

  await deleteTokensByUserIdService(existingUser.id);

  const tokens = await generateAuthTokensService(existingUser);

  const { password: _password, ...user } = existingUser;

  return {
    user: user,
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

  const { user, resetPasswordToken } = await prisma.$transaction(async (tx) => {
    const user = await findUserByEmail(email, tx);
    if (!user) return;

    const resetPasswordToken = await generateResetPasswordTokenService(
      user.id,
      tx,
    );

    return {
      user,
      resetPasswordToken,
    };
  });

  await sendEmail(USER_FORGOT_PASSWORD_TEMPLATE, {
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    token: resetPasswordToken,
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

export const refreshTokenService = async (payload: RefreshTokenDto) => {
  const { refreshToken } = payload;

  const refreshTokenDoc = await verifyTokenService(
    refreshToken,
    TOKEN_TYPE.REFRESH,
  );

  const user = await findUserById(refreshTokenDoc.user_id);

  if (!user) throw new ApiError(404, "User not found");

  await deleteTokensByUserIdService(refreshTokenDoc.user_id);

  const newTokens = await generateAuthTokensService(user);

  return newTokens;
};

export const logoutService = async (payload: LogoutDto) => {
  const { refreshToken } = payload;

  const refreshTokenDoc = await verifyTokenService(
    refreshToken,
    TOKEN_TYPE.REFRESH,
  );

  const user = await findUserById(refreshTokenDoc.user_id);

  if (!user) throw new ApiError(404, "User not found");

  const deletedTokens = await deleteTokensByUserIdService(
    refreshTokenDoc.user_id,
  );

  if (!deletedTokens) throw new ApiError(400, "Failed to logout user");
};
