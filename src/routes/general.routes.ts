import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  generateS3PresignedUploadURLSchema,
  generateS3PresignedViewURLSchema,
} from "../validations/general.validation";
import validate from "../middlewares/validate.middleware";
import { asyncHandler } from "../utils/asyncHandler.util";
import {
  generateS3PresignedUploadUrl,
  generateS3PresignedViewURL,
} from "../controllers/general.controller";

const generalRouter = Router();

generalRouter.post(
  "/generate-upload-url",
  authenticate,
  validate(generateS3PresignedUploadURLSchema),
  asyncHandler(generateS3PresignedUploadUrl),
);

generalRouter.post(
  "/generate-view-url",
  validate(generateS3PresignedViewURLSchema),
  asyncHandler(generateS3PresignedViewURL),
);

export default generalRouter;
