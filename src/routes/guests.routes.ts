import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import validate from "../middlewares/validate.middleware";
import { addNewGuestSchema } from "../validations/guest.validations";
import { asyncHandler } from "../utils/asyncHandler.util";
import { addNewGuest } from "../controllers/guest.controller";

const guestsRouter = Router();

guestsRouter.get("/", authenticate, asyncHandler(addNewGuest));

guestsRouter.post(
  "/",
  authenticate,
  validate(addNewGuestSchema),
  asyncHandler(addNewGuest),
);

export default guestsRouter;
