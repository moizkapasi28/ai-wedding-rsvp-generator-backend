import { type Request, type Response } from "express";
import {
  ForgotPasswordDto,
  LoginDto,
  ResendEmailVerificationDto,
  ResetPasswordDto,
  SignUpDto,
  VerifyEmailDto,
} from "../validations/auth.validation";
import {
  forgotPasswordService,
  resendVerificationEmailService,
  resetPasswordService,
  signInService,
  signUpService,
  verifyEmailService,
} from "../services/auth.service";
import { sendSuccess } from "../utils/response.util";

export const signUp = async (
  req: Request<{}, {}, SignUpDto>,
  res: Response,
): Promise<Response> => {
  const { body } = req;

  const user = await signUpService(body);

  return sendSuccess(res, "User created successfully", user, 201);
};

export const signIn = async (
  req: Request<{}, {}, LoginDto>,
  res: Response,
): Promise<Response> => {
  const { body } = req;

  const user = await signInService(body);

  return sendSuccess(res, "User logged in successfully", user, 200);
};

export const verifyEmail = async (
  req: Request<{}, {}, {}, VerifyEmailDto>,
  res: Response,
): Promise<Response> => {
  const { query } = req;

  await verifyEmailService(query);

  return sendSuccess(res, "Email verified successfully", {}, 200);
};

export const resendVerificationEmail = async (
  req: Request<{}, {}, ResendEmailVerificationDto>,
  res: Response,
): Promise<Response> => {
  const { body } = req;

  await resendVerificationEmailService(body);

  return sendSuccess(res, "Verification email sent successfully", {}, 204);
};

export const forgotPasswordEmail = async (
  req: Request<{}, {}, ForgotPasswordDto>,
  res: Response,
): Promise<Response> => {
  const { body } = req;

  await forgotPasswordService(body);

  return sendSuccess(res, "Password reset link sent successfully", {}, 204);
};

export const resetPassword = async (
  req: Request<{}, {}, ResetPasswordDto>,
  res: Response,
) => {
  const { body } = req;

  await resetPasswordService(body);

  return sendSuccess(res, "Password reset successfully", {}, 200);
};
