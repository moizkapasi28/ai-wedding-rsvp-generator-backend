import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import validate from "../middlewares/validate.middleware";
import {
  generateInviteCardImageSchema,
  getInviteCardGenerationStatusSchema,
  getAiInvitecardsByWeddingSchema,
  getInviteCardVersionsSchema,
  restoreInviteCardVersionSchema,
  updateInviteCardSchema,
} from "../validations/inviteCard.validation";
import { asyncHandler } from "../utils/asyncHandler.util";
import {
  generateInviteCardImage,
  getInviteCardGenerationStatus,
  getInviteCardsByWedding,
  getInviteCardVersions,
  restoreInviteCardVersion,
  updateInviteCard,
} from "../controllers/inviteCard.controller";

import { imageGenerationLimiter } from "../middlewares/rateLimiter.middleware";

const inviteCardRouter = Router();

inviteCardRouter.get(
  "/cards/:weddingId",
  authenticate,
  validate(getAiInvitecardsByWeddingSchema),
  asyncHandler(getInviteCardsByWedding),
);

inviteCardRouter.get(
  "/:id/generation-status",
  authenticate,
  validate(getInviteCardGenerationStatusSchema),
  asyncHandler(getInviteCardGenerationStatus),
);

inviteCardRouter.get(
  "/:id/versions",
  authenticate,
  validate(getInviteCardVersionsSchema),
  asyncHandler(getInviteCardVersions),
);

inviteCardRouter.post(
  "/:id/versions/:versionId/restore",
  authenticate,
  validate(restoreInviteCardVersionSchema),
  asyncHandler(restoreInviteCardVersion),
);

inviteCardRouter.patch(
  "/:id",
  authenticate,
  validate(updateInviteCardSchema),
  asyncHandler(updateInviteCard),
);

inviteCardRouter.post(
  "/generate-invite",
  authenticate,
  imageGenerationLimiter,
  validate(generateInviteCardImageSchema),
  asyncHandler(generateInviteCardImage),
);

export default inviteCardRouter;
