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
  updateProfileSchema,
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
  myProfile,
  updateProfile,
} from "../controllers/auth.controller";
import { asyncHandler } from "../utils/asyncHandler.util";
import { authenticate } from "../middlewares/auth.middleware";
import { authLimiter } from "../middlewares/rateLimiter.middleware";

const authRouter = Router();

authRouter.post("/signup", authLimiter, validate(signUpSchema), asyncHandler(signUp));

authRouter.post("/signin", authLimiter, validate(loginSchema), asyncHandler(signIn));

authRouter.post(
  "/verify-email",
  authLimiter,
  validate(verifyEmailSchema),
  asyncHandler(verifyEmail),
);

authRouter.post(
  "/resend-verify-email",
  authLimiter,
  validate(resendEmailVerificationSchema),
  asyncHandler(resendVerificationEmail),
);

authRouter.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(forgotPasswordEmail),
);

authRouter.patch(
  "/reset-password",
  authLimiter,
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

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(myProfile),
);

authRouter.patch(
  "/me",
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(updateProfile),
);

export default authRouter;
