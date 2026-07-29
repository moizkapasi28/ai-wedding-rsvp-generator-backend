import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import validate from "../middlewares/validate.middleware";
import {
  getAiInvitecardsByWeddingSchema,
  updateAiInviteCardSchema,
} from "../validations/aiInviteCard.validation";
import { asyncHandler } from "../utils/asyncHandler.util";
import { getAiInviteCardsByWedding, saveInviteCardDraft, generateAIInviteCardImage } from "../controllers/aiInviteCard.controller";

const aiInviteCardRouter = Router();

aiInviteCardRouter.get(
  "/cards/:weddingId",
  authenticate,
  validate(getAiInvitecardsByWeddingSchema),
  asyncHandler(getAiInviteCardsByWedding),
);

aiInviteCardRouter.patch(
  "/draft/:eventId",
  authenticate,
  validate(updateAiInviteCardSchema),
  asyncHandler(saveInviteCardDraft),
);

aiInviteCardRouter.post(
  "/generate/:eventId",
  authenticate,
  asyncHandler(generateAIInviteCardImage),
);

export default aiInviteCardRouter;
