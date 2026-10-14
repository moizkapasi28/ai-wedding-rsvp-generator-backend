import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";
import { redactUrlForLog } from "../utils/logUrl.util";

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: redactUrlForLog(req.originalUrl),
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("user-agent") || "",
    };

    if (res.statusCode >= 400) {
      logger.error(logData, "Request failed");
    } else {
      logger.info(logData, "Request successful");
    }
  });

  next();
};
