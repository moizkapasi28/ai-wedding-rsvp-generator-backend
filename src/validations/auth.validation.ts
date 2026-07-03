import { z } from "zod";
export const signUpBodySchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  mobile_number: z.string(),
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

export const verifyEmailQuerySchema = z.object({
  token: z.string(),
});

export const verifyEmailSchema = z.object({
  query: verifyEmailQuerySchema,
});

export type VerifyEmailDto = z.infer<typeof verifyEmailQuerySchema>;

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
