import { type Request, type Response } from "express";
import {
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  ResendEmailVerificationDto,
  ResetPasswordDto,
  SignUpDto,
  VerifyEmailDto,
  UpdateProfileDto,
} from "../validations/auth.validation";
import {
  forgotPasswordService,
  logoutService,
  refreshTokenService,
  resendVerificationEmailService,
  resetPasswordService,
  signInService,
  signUpService,
  userProfileService,
  verifyEmailService,
  updateProfileService,
} from "../services/auth.service";
import { sendSuccess } from "../utils/response.util";

export const signUp = async (
  req: Request<{}, {}, SignUpDto>,
  res: Response,
): Promise<Response> => {
  const { body } = req;

  const user = await signUpService(body);

  return sendSuccess(
    res,
    "Registration successful. Please check your email to verify your account.",
    user,
    201,
  );
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
  req: Request<VerifyEmailDto>,
  res: Response,
): Promise<Response> => {
  const { body } = req;

  await verifyEmailService(body);

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

export const refreshToken = async (
  req: Request<{}, {}, RefreshTokenDto>,
  res: Response,
) => {
  const { body } = req;

  const tokens = await refreshTokenService(body);

  return sendSuccess(res, "Tokens refreshed successfully", tokens, 200);
};

export const logout = async (
  req: Request<{}, {}, LogoutDto>,
  res: Response,
) => {
  const { body } = req;

  await logoutService(body);

  return sendSuccess(res, "User logged out successfully", {}, 200);
};

export const myProfile = async (req: Request, res: Response) => {
  const { id } = req.user;

  const user = await userProfileService(id);

  return sendSuccess(res, "Profile fetched successfully", user, 200);
};

export const updateProfile = async (
  req: Request<{}, {}, UpdateProfileDto>,
  res: Response,
) => {
  const { id } = req.user;
  const { body } = req;

  console.log(body)

  const payload = {
    first_name: body.firstName,
    last_name: body.lastName,
    mobile_number: body.mobileNumber,
    profile_picture: body.profilePicture,
  };

  const updatedUser = await updateProfileService(id, payload);

  return sendSuccess(res, "Profile updated successfully", updatedUser, 200);
};
