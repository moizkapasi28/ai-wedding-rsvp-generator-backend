import { Router } from "express";
import { getRsvp, submitRsvp } from "../controllers/rsvp.controller";
import { rsvpLimiter } from "../middlewares/rateLimiter.middleware";
import validate from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/asyncHandler.util";
import {
  getRsvpSchema,
  submitRsvpSchema,
} from "../validations/rsvp.validation";

// Public routes: the event invite's invite_token is the only credential
const rsvpRouter = Router();

rsvpRouter.get("/:token", validate(getRsvpSchema), asyncHandler(getRsvp));

rsvpRouter.put(
  "/:token",
  rsvpLimiter,
  validate(submitRsvpSchema),
  asyncHandler(submitRsvp),
);

export default rsvpRouter;
