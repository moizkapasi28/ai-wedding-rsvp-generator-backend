import { Router } from "express";
import {
  editEventInviteFormat,
  generateEventInviteFormatImage,
  geteventInviteFormat,
  getEventInviteFormatByEvent,
} from "../controllers/eventInviteFormat.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/asyncHandler.util";
import {
  generateEventInviteFormatImageSchema,
  getEventInviteFormatByeventSchema,
  getEventInviteFormatSchema,
  updateEventInviteFormatSchema,
} from "../validations/eventInviteFormat.validation";

const eventInviteFormatRouter = Router();

eventInviteFormatRouter.get(
  "/:id",
  validate(getEventInviteFormatSchema),
  asyncHandler(geteventInviteFormat),
);

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
