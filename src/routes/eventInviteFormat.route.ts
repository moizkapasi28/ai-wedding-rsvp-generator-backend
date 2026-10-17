import { Router } from "express";
import {
  editEventInviteFormat,
  generateEventInviteFormatImage,
  getEventInviteFormatsByWedding,
} from "../controllers/eventInviteFormat.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { imageGenerationLimiter } from "../middlewares/rateLimiter.middleware";
import { asyncHandler } from "../utils/asyncHandler.util";
import {
  generateEventInviteFormatImageSchema,
  getEventInviteFormatsByWeddingSchema,
  updateEventInviteFormatSchema,
} from "../validations/eventInviteFormat.validation";

const eventInviteFormatRouter = Router();

eventInviteFormatRouter.get(
  "/pages/:weddingId",
  authenticate,
  validate(getEventInviteFormatsByWeddingSchema),
  asyncHandler(getEventInviteFormatsByWedding),
);

eventInviteFormatRouter.patch(
  "/:id",
  authenticate,
  validate(updateEventInviteFormatSchema),
  asyncHandler(editEventInviteFormat),
);

eventInviteFormatRouter.post(
  "/generate-image",
  authenticate,
  // Shares the invite card limit: both spend AI credits and hold a Gemini call
  imageGenerationLimiter,
  validate(generateEventInviteFormatImageSchema),
  asyncHandler(generateEventInviteFormatImage),
);

export default eventInviteFormatRouter;
