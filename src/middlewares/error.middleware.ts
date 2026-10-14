import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError.util";
import { sendError } from "../utils/response.util";
import logger from "../config/logger";
import { redactUrlForLog } from "../utils/logUrl.util";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  logger.error({ err, method: req.method, url: redactUrlForLog(req.originalUrl) }, err.message);

  if (err instanceof ApiError) {
    return sendError(res, err.message, err.statusCode);
  }

  return sendError(res, "Something went wrong! Please try again later", 500);
};
