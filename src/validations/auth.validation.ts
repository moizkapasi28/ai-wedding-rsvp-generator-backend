import { z } from "zod";
export const signUpBodySchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  mobileNumber: z.string(),
  email: z.string(),
  password: z.string(),
});

export const signUpSchema = z.object({
  body: signUpBodySchema,
});

export type SignUpDto = z.infer<typeof signUpBodySchema>;

export const loginBodySchema = z.object({
  email: z.string(),
  password: z.string(),
});

export const loginSchema = z.object({
  body: loginBodySchema,
});

export type LoginDto = z.infer<typeof loginBodySchema>;

export const verifyEmailBodySchema = z.object({
  token: z
    .string()
    .trim()
    .describe("Email verification to verify email address"),
});

export const verifyEmailSchema = z.object({
  body: verifyEmailBodySchema,
});

export type VerifyEmailDto = z.infer<typeof verifyEmailBodySchema>;

export const resendEmailVerificationBodySchema = z.object({
  email: z.string(),
});

export const resendEmailVerificationSchema = z.object({
  body: resendEmailVerificationBodySchema,
});

export type ResendEmailVerificationDto = z.infer<
  typeof resendEmailVerificationBodySchema
>;

export const forgotPasswordBodySchema = z.object({
  email: z.string(),
});

export const forgotPasswordSchema = z.object({
  body: forgotPasswordBodySchema,
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordBodySchema>;

export const resetPasswordBodySchema = z.object({
  token: z.string(),
  newPassword: z.string(),
});

export const resetPasswordSchema = z.object({
  body: resetPasswordBodySchema,
});

export type ResetPasswordDto = z.infer<typeof resetPasswordBodySchema>;

export const refreshTokenBodySchema = z.object({
  refreshToken: z.string(),
});

export const refreshTokenSchema = z.object({
  body: refreshTokenBodySchema,
});

export type RefreshTokenDto = z.infer<typeof refreshTokenBodySchema>;
