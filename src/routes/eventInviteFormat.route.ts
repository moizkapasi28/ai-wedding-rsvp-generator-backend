import { Router } from "express";
import {
  editEventInviteFormat,
  generateEventInviteFormatImage,
  getEventInviteFormatsByWedding,
} from "../controllers/eventInviteFormat.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
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
  validate(generateEventInviteFormatImageSchema),
  asyncHandler(generateEventInviteFormatImage),
);

export default eventInviteFormatRouter;
