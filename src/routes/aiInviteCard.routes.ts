import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import validate from "../middlewares/validate.middleware";
import {
  generateAIInviteCardImageSchema,
  getAiInvitecardsByWeddingSchema,
  updateAiInviteCardSchema,
} from "../validations/aiInviteCard.validation";
import { asyncHandler } from "../utils/asyncHandler.util";
import {
  generateAIInviteCardImage,
  getAiInviteCardsByWedding,
} from "../controllers/aiInviteCard.controller";

const aiInviteCardRouter = Router();

aiInviteCardRouter.get(
  "/cards/:weddingId",
  authenticate,
  validate(getAiInvitecardsByWeddingSchema),
  asyncHandler(getAiInviteCardsByWedding),
);

aiInviteCardRouter.patch(
  "/:id",
  authenticate,
  validate(updateAiInviteCardSchema),
  asyncHandler(getAiInviteCardsByWedding),
);

aiInviteCardRouter.post(
  "/generate-invite",
  authenticate,
  validate(generateAIInviteCardImageSchema),
  asyncHandler(generateAIInviteCardImage),
);

export default aiInviteCardRouter;
