import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError.util";
import { sendError } from "../utils/response.util";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof ApiError) {
    return sendError(res, err.message, err.statusCode);
  }

  return sendError(res, "Something went wrong!", 500);
};
