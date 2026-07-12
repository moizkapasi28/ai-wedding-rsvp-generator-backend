import { type Request, type Response } from "express";
import {
  generateEventInviteFormatImageService,
  getEventInviteFormatByEventService,
  getEventinviteFormatService,
  updateEventInviteFormatService,
} from "../services/eventInviteFormat.service";
import { sendSuccess } from "../utils/response.util";
import {
  GenerateEventInviteFormatImageDto,
  GetEventInviteFormatByEventDto,
  GetEventInviteFormatDto,
  UpdateEventInviteFormatDto,
} from "../validations/eventInviteFormat.validation";
import axios from "axios";

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
    body.illustrationStyle,
    body.negativePrompt,
  );

  return sendSuccess(res, "Image generated successfully", { key: result }, 200);
};
