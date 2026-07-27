import { type Request, type Response } from "express";
import {
  generateEventInviteFormatImageService,
  getEventInviteFormatByEventService,
  getEventInviteFormatsByWeddingService,
  getEventinviteFormatService,
  updateEventInviteFormatService,
} from "../services/eventInviteFormat.service";
import { sendSuccess } from "../utils/response.util";
import {
  GenerateEventInviteFormatImageDto,
  GetEventInviteFormatByEventDto,
  GetEventInviteFormatDto,
  GetEventInviteFormatsByWeddingDto,
  GetEventInviteFormatsByWeddingQueryDto,
  UpdateEventInviteFormatDto,
} from "../validations/eventInviteFormat.validation";
import { getUserWeddingService } from "../services/wedding.service";

export const getEventInviteFormatsByWedding = async (
  req: Request<
    GetEventInviteFormatsByWeddingDto,
    any,
    any,
    GetEventInviteFormatsByWeddingQueryDto
  >,
  res: Response,
) => {
  const { user, params, query } = req;
  const page = query.page || 1;

  await getUserWeddingService(user.id, params.weddingId);

  const guestEventInviteFormatsData =
    await getEventInviteFormatsByWeddingService(params.weddingId, page);

  return sendSuccess(
    res,
    "Invite formats fetched successfully",
    guestEventInviteFormatsData,
    200,
  );
};

export const getEventInviteFormatByEvent = async (
  req: Request<GetEventInviteFormatByEventDto>,
  res: Response,
): Promise<Response> => {
  const { user, params } = req;

  const guestEventInviteFormat = await getEventInviteFormatByEventService(
    params.eventId,
    user.id,
  );

  return sendSuccess(
    res,
    "Invite format fetched successfully",
    guestEventInviteFormat,
    200,
  );
};

export const editEventInviteFormat = async (
  req: Request<
    UpdateEventInviteFormatDto["params"],
    {},
    UpdateEventInviteFormatDto["body"]
  >,
  res: Response,
): Promise<Response> => {
  const { user, params, body } = req;

  const guestEventInviteFormat = await updateEventInviteFormatService(
    params.id,
    user.id,
    body,
  );

  return sendSuccess(
    res,
    "Invite format updated successfully",
    guestEventInviteFormat,
    200,
  );
};

export const geteventInviteFormat = async (
  req: Request<GetEventInviteFormatDto>,
  res: Response,
): Promise<Response> => {
  const { params } = req;

  const eventInviteFormat = await getEventinviteFormatService(params.id);

  return sendSuccess(
    res,
    "Invite format fetched successfully",
    eventInviteFormat,
    200,
  );
};

export const generateEventInviteFormatImage = async (
  req: Request<{}, {}, GenerateEventInviteFormatImageDto>,
  res: Response,
) => {
  const { user, body } = req;

  const result = await generateEventInviteFormatImageService(
    body.eventId,
    user.id,
    body.rawImageKey,
    {
      imageType: body.photoType,
      styleId: body.illustrationStyle,
      attireId: body.attireId,
      brideAttireId: body.brideAttireId,
      groomAttireId: body.groomAttireId,
      customStyleNote: body.customStyleNote,
      theme: body.illustrationTheme,
    },
  );

  return sendSuccess(res, "Image generated successfully", { key: result }, 200);
};
