import { NextFunction, Request, Response } from "express";
import { verifyTokenService } from "../services/token.service";
import { TOKEN_TYPE } from "../enums/token.enum";
import { findUserById } from "../repositories/user.repository";
import { ApiError } from "../utils/apiError.util";
import { asyncHandler } from "../utils/asyncHandler.util";

export const authenticate = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Please authenticate");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new ApiError(401, "Please authenticate");
    }

    try {
      const tokenDoc = await verifyTokenService(token, TOKEN_TYPE.ACCESS);

      const user = await findUserById(tokenDoc.user_id);

      if (!user) {
        throw new ApiError(401, "Please authenticate");
      }

      // Attach user to request object
      req.user = user;

      next();
    } catch (error) {
      throw new ApiError(401, "Please authenticate");
    }
  },
);
