import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import validate from "../middlewares/validate.middleware";
import {
  addNewWeddingEventSchema,
  editWeddingEventSchema,
  getAllWeddingEventsSchema,
  getWeddingEventSchema,
} from "../validations/event.validations";
import { asyncHandler } from "../utils/asyncHandler.util";
import {
  addNewWeddingEvent,
  deleteWeddingEvent,
  editWeddingEvent,
  getAllWeddingEvents,
} from "../controllers/event.controller";

const eventRouter = Router();

eventRouter.get(
  "/",
  authenticate,
  validate(getAllWeddingEventsSchema),
  asyncHandler(getAllWeddingEvents),
);

eventRouter.post(
  "/",
  authenticate,
  validate(addNewWeddingEventSchema),
  asyncHandler(addNewWeddingEvent),
);

eventRouter.patch(
  "/:id",
  authenticate,
  validate(editWeddingEventSchema),
  asyncHandler(editWeddingEvent),
);

eventRouter.delete(
  "/:id",
  authenticate,
  validate(getWeddingEventSchema),
  asyncHandler(deleteWeddingEvent),
);

export default eventRouter;
