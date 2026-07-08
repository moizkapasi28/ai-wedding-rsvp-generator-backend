import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import validate from "../middlewares/validate.middleware";
import {
  addNewGuestSchema,
  getAllGuestsSchema,
  getWeddingGuestSchema,
} from "../validations/guest.validations";
import { asyncHandler } from "../utils/asyncHandler.util";
import {
  addNewGuest,
  deleteWeddingGuest,
  getAllGuests,
  getWeddingGuest,
} from "../controllers/guest.controller";

const guestsRouter = Router();

guestsRouter.get(
  "/",
  authenticate,
  validate(getAllGuestsSchema),
  asyncHandler(getAllGuests),
);

guestsRouter.post(
  "/",
  authenticate,
  validate(addNewGuestSchema),
  asyncHandler(addNewGuest),
);

guestsRouter.get(
  "/:id",
  authenticate,
  validate(getWeddingGuestSchema),
  asyncHandler(getWeddingGuest),
);

guestsRouter.delete(
  "/:id",
  authenticate,
  validate(getWeddingGuestSchema),
  asyncHandler(deleteWeddingGuest),
);

export default guestsRouter;
