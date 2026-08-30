import { type Request, type Response } from "express";
import {
  GenerateAIInviteCardImageDto,
  GetAiInviteCardsByWeddingParamsDto,
  GetAiInviteCardsByWeddingQueryDto,
  UpdateAiInviteCardDto,
} from "../validations/aiInviteCard.validation";
import { getUserWeddingService } from "../services/wedding.service";
import {
  generateAIInviteCardService,
  getAiInviteCardsByWeddingService,
  updateAiInviteCardService,
} from "../services/aiInviteCard.service";
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

  const aiInviteCard = await updateAiInviteCardService(
    params.id,
    user.id,
    body,
  );

  return sendSuccess(
    res,
    "Invite card updated successfully",
    aiInviteCard,
    200,
  );
};

export const generateAIInviteCardImage = async (
  req: Request<{}, {}, GenerateAIInviteCardImageDto>,
  res: Response,
) => {
  const { user, body } = req;

  const result = await generateAIInviteCardService(body.eventId, user.id, body);

  return sendSuccess(res, "AI invite card generated successfully", { key: result }, 200);
};
