import { type Request, type Response } from "express";
import {
  GenerateInviteCardImageDto,
  GetInviteCardGenerationStatusParamsDto,
  GetInviteCardsByWeddingParamsDto,
  GetInviteCardsByWeddingQueryDto,
  UpdateInviteCardDto,
} from "../validations/inviteCard.validation";
import { getUserWeddingService } from "../services/wedding.service";
import {
  generateInviteCardService,
  getInviteCardGenerationStatusService,
  getInviteCardsByWeddingService,
  updateInviteCardService,
} from "../services/inviteCard.service";
import { sendSuccess } from "../utils/response.util";

export const getInviteCardsByWedding = async (
  req: Request<
    GetInviteCardsByWeddingParamsDto,
    {},
    {},
    GetInviteCardsByWeddingQueryDto
  >,
  res: Response,
) => {
  const { user, params, query } = req;
  const page = query.page || 1;
  const limit = query.limit || 5;

  await getUserWeddingService(user.id, params.weddingId);

  const inviteCards = await getInviteCardsByWeddingService(
    params.weddingId,
    page,
    limit,
  );

  return sendSuccess(
    res,
    "Invite cards fetched successfully",
    inviteCards,
    200,
  );
};

export const updateInviteCard = async (
  req: Request<
    UpdateInviteCardDto["params"],
    {},
    UpdateInviteCardDto["body"]
  >,
  res: Response,
) => {
  const { user, params, body } = req;

  const inviteCard = await updateInviteCardService(
    params.id,
    user.id,
    body,
  );

  return sendSuccess(
    res,
    "Invite card updated successfully",
    inviteCard,
    200,
  );
};

export const generateInviteCardImage = async (
  req: Request<{}, {}, GenerateInviteCardImageDto>,
  res: Response,
) => {
  const { user, body } = req;

  const result = await generateInviteCardService(body.eventId, user.id, body);

  // 202: the design is produced by the worker, so the request only reports that it was queued
  return sendSuccess(res, "AI invite card generation started", result, 202);
};

export const getInviteCardGenerationStatus = async (
  req: Request<GetInviteCardGenerationStatusParamsDto>,
  res: Response,
) => {
  const { user, params } = req;

  const status = await getInviteCardGenerationStatusService(
    params.id,
    user.id,
  );

  return sendSuccess(res, "Generation status fetched successfully", status, 200);
};
