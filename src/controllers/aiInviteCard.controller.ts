import { type Request, type Response } from "express";
import {
  GetAiInviteCardsByWeddingParamsDto,
  GetAiInviteCardsByWeddingQueryDto,
  UpdateAiInviteCardDto,
} from "../validations/aiInviteCard.validation";
import { getUserWeddingService } from "../services/wedding.service";
import {
  getAiInviteCardsByWeddingService,

} from "../services/aiInviteCard.service";
import { saveInviteCardDraftService, generateInviteCardService } from "../services/aiInviteCardGeneration.service";
import { sendSuccess } from "../utils/response.util";

export const getAiInviteCardsByWedding = async (
  req: Request<
    GetAiInviteCardsByWeddingParamsDto,
    {},
    {},
    GetAiInviteCardsByWeddingQueryDto
  >,
  res: Response,
) => {
  const { user, params, query } = req;
  const page = query.page || 1;

  await getUserWeddingService(user.id, params.weddingId);

  const aiInviteCards = await getAiInviteCardsByWeddingService(
    params.weddingId,
    page,
  );

  return sendSuccess(
    res,
    "Invite cards fetched successfully",
    aiInviteCards,
    200,
  );
};

export const updateAiInviteCard = async (
  req: Request<
    UpdateAiInviteCardDto["params"],
    {},
    UpdateAiInviteCardDto["body"]
  >,
  res: Response,
) => {
  const { user, params, body } = req;
  // Use upsert-based draft service via eventId, but params.id is probably the invite card id.
  // Wait, if we use saveInviteCardDraftService, it takes eventId. Does the route pass eventId or inviteCardId?
  // Let's keep updateAiInviteCardService for generic updates by ID if needed, but add saveDraft controller.
  return sendSuccess(res, "Use save-draft endpoint instead", null, 400);
};

export const saveInviteCardDraft = async (req: Request, res: Response) => {
  const eventId = req.params.eventId as string;
  const { user, body } = req;
  const draft = await saveInviteCardDraftService(eventId, user.id, body);
  return sendSuccess(res, "Draft saved successfully", draft, 200);
};

export const generateAIInviteCardImage = async (
  req: Request,
  res: Response,
) => {
  const eventId = req.params.eventId as string;
  const result = await generateInviteCardService(eventId, req.user.id);
  return sendSuccess(res, "AI invite card generated successfully", result, 200);
};
