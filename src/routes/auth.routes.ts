import { Router, type Request, type Response } from "express";
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  resendEmailVerificationSchema,
  resetPasswordSchema,
  signUpSchema,
  verifyEmailSchema,
} from "../validations/auth.validation";
import validate from "../middlewares/validate.middleware";
import {
  forgotPasswordEmail,
  logout,
  refreshToken,
  resendVerificationEmail,
  resetPassword,
  signIn,
  signUp,
  verifyEmail,
} from "../controllers/auth.controller";
import { asyncHandler } from "../utils/asyncHandler.util";
import { authenticate } from "../middlewares/auth.middleware";

const authRouter = Router();

authRouter.post("/signup", validate(signUpSchema), asyncHandler(signUp));

authRouter.post("/signin", validate(loginSchema), asyncHandler(signIn));

authRouter.post(
  "/verify-email",
  validate(verifyEmailSchema),
  asyncHandler(verifyEmail),
);

authRouter.post(
  "/resend-verify-email",
  validate(resendEmailVerificationSchema),
  asyncHandler(resendVerificationEmail),
);

authRouter.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  asyncHandler(forgotPasswordEmail),
);

authRouter.patch(
  "/reset-password",
  validate(resetPasswordSchema),
  asyncHandler(resetPassword),
);

authRouter.post(
  "/access-token",
  validate(refreshTokenSchema),
  asyncHandler(refreshToken),
);

authRouter.post(
  "/logout",
  authenticate,
  validate(logoutSchema),
  asyncHandler(logout),
);

export default authRouter;
