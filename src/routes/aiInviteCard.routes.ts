import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import validate from "../middlewares/validate.middleware";
import {
  generateAIInviteCardImageSchema,
  getAiInviteCardGenerationStatusSchema,
  getAiInvitecardsByWeddingSchema,
  updateAiInviteCardSchema,
} from "../validations/aiInviteCard.validation";
import { asyncHandler } from "../utils/asyncHandler.util";
import {
  generateAIInviteCardImage,
  getAiInviteCardGenerationStatus,
  getAiInviteCardsByWedding,
  updateAiInviteCard,
} from "../controllers/aiInviteCard.controller";

import { imageGenerationLimiter } from "../middlewares/rateLimiter.middleware";

const aiInviteCardRouter = Router();

aiInviteCardRouter.get(
  "/cards/:weddingId",
  authenticate,
  validate(getAiInvitecardsByWeddingSchema),
  asyncHandler(getAiInviteCardsByWedding),
);

aiInviteCardRouter.get(
  "/:id/generation-status",
  authenticate,
  validate(getAiInviteCardGenerationStatusSchema),
  asyncHandler(getAiInviteCardGenerationStatus),
);

aiInviteCardRouter.patch(
  "/:id",
  authenticate,
  validate(updateAiInviteCardSchema),
  asyncHandler(updateAiInviteCard),
);

aiInviteCardRouter.post(
  "/generate-invite",
  authenticate,
  imageGenerationLimiter,
  validate(generateAIInviteCardImageSchema),
  asyncHandler(generateAIInviteCardImage),
);

export default aiInviteCardRouter;
