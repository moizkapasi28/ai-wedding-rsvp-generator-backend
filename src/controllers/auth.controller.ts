import { type Request, type Response } from "express";
import { LoginDto, SignUpDto } from "../validations/auth.validation";
import { signInService, signUpService } from "../services/auth.service";
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
