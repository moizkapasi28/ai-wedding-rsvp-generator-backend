import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import validate from "../middlewares/validate.middleware";
import {
  addNewGuestSchema,
  editWeddingGuestSchema,
  getAllGuestsSchema,
  getWeddingGuestSchema,
} from "../validations/guest.validations";
import { asyncHandler } from "../utils/asyncHandler.util";
import {
  addNewGuest,
  deleteWeddingGuest,
  editWeddingGuest,
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

guestsRouter.patch(
  "/:id",
  authenticate,
  validate(editWeddingGuestSchema),
  asyncHandler(editWeddingGuest),
);

guestsRouter.delete(
  "/:id",
  authenticate,
  validate(getWeddingGuestSchema),
  asyncHandler(deleteWeddingGuest),
);

export default guestsRouter;
