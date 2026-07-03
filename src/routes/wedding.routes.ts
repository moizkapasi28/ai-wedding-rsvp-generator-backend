import { Router } from "express";
import {
  addNewUserWedding,
  deleteWedding,
  editWedding,
  getAllUserWeddings,
  getUserWedding,
} from "../controllers/wedding.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler.util";
import {
  getAllUserWeddingsSchema,
  addNewWeddingSchema,
  getUserWeddingSchema,
  editWeddingSchema,
} from "../validations/wedding.validation";
import validate from "../middlewares/validate.middleware";

const weddingRouter = Router();

weddingRouter.get(
  "/",
  authenticate,
  validate(getAllUserWeddingsSchema),
  asyncHandler(getAllUserWeddings),
);

weddingRouter.post(
  "/",
  authenticate,
  validate(addNewWeddingSchema),
  asyncHandler(addNewUserWedding),
);

weddingRouter.get(
  "/:id",
  authenticate,
  validate(getUserWeddingSchema),
  asyncHandler(getUserWedding),
);

weddingRouter.patch(
  "/:id",
  authenticate,
  validate(editWeddingSchema),
  asyncHandler(editWedding),
);

weddingRouter.delete(
  "/:id",
  authenticate,
  validate(getUserWeddingSchema),
  asyncHandler(deleteWedding),
);

export default weddingRouter;
