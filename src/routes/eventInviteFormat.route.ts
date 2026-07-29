import { Router } from "express";
import {
  editEventInviteFormat,
  generateEventInviteFormatImage,
  geteventInviteFormat,
  getEventInviteFormatByEvent,
  getEventInviteFormatsByWedding,
} from "../controllers/eventInviteFormat.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/asyncHandler.util";
import {
  generateEventInviteFormatImageSchema,
  getEventInviteFormatByeventSchema,
  getEventInviteFormatsByWeddingSchema,
  getEventInviteFormatSchema,
  updateEventInviteFormatSchema,
} from "../validations/eventInviteFormat.validation";

const eventInviteFormatRouter = Router();

eventInviteFormatRouter.get(
  "/pages/:weddingId",
  authenticate,
  validate(getEventInviteFormatsByWeddingSchema),
  asyncHandler(getEventInviteFormatsByWedding),
);

eventInviteFormatRouter.get(
  "/:id",
  validate(getEventInviteFormatSchema),
  asyncHandler(geteventInviteFormat),
);

//!! Currenlty this endpoint is not getting used on client side
eventInviteFormatRouter.get(
  "/event/:eventId",
  authenticate,
  validate(getEventInviteFormatByeventSchema),
  asyncHandler(getEventInviteFormatByEvent),
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
