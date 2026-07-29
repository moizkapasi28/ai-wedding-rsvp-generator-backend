import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import validate from "../middlewares/validate.middleware";
import {
  getAiInvitecardsByWeddingSchema,
  updateAiInviteCardSchema,
} from "../validations/aiInviteCard.validation";
import { asyncHandler } from "../utils/asyncHandler.util";
import { getAiInviteCardsByWedding } from "../controllers/aiInviteCard.controller";

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
  asyncHandler(getAiInviteCardsByWedding),
);

export default aiInviteCardRouter;
