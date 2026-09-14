import { Router } from "express";
import {
  getRsvp,
  submitGuestRsvp,
  submitRsvp,
} from "../controllers/rsvp.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { rsvpLimiter } from "../middlewares/rateLimiter.middleware";
import validate from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/asyncHandler.util";
import {
  getRsvpSchema,
  submitGuestRsvpSchema,
  submitRsvpSchema,
} from "../validations/rsvp.validation";

const rsvpRouter = Router();

// Host portal: set a reply for a guest who couldn't use their link
rsvpRouter.put(
  "/invite/:inviteId",
  authenticate,
  validate(submitGuestRsvpSchema),
  asyncHandler(submitGuestRsvp),
);

// Public routes: the event invite's invite_token is the only credential
rsvpRouter.get("/:token", validate(getRsvpSchema), asyncHandler(getRsvp));

rsvpRouter.put(
  "/:token",
  rsvpLimiter,
  validate(submitRsvpSchema),
  asyncHandler(submitRsvp),
);

export default rsvpRouter;
