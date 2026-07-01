import { Router, type Request, type Response } from "express";
import { loginSchema, signUpSchema } from "../validations/auth.validation";
import validate from "../middlewares/validate.middleware";
import { signIn, signUp } from "../controllers/auth.controller";
import { asyncHandler } from "../utils/asyncHandler.util";

export const authRouter = Router();

authRouter.post("/signup", validate(signUpSchema), asyncHandler(signUp));
authRouter.post("/signin", validate(loginSchema), asyncHandler(signIn));
