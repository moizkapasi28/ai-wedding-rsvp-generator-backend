import { type Request, type Response } from "express";
import {
  addNewWeddingEventService,
  deleteWeddingEventService,
  editWeddingEventService,
  getAllWeddingEventsService,
  getWeddingEventService,
} from "../services/event.service";
import { getUserWeddingService } from "../services/wedding.service";
import { sendSuccess } from "../utils/response.util";
import {
  AddNewWeddingEventDto,
  EditWeddingEventDto,
  GetAllWeddingEventsDto,
  GetWeddingEventDto,
} from "../validations/event.validations";

export const getAllWeddingEvents = async (
  req: Request<{}, {}, {}, GetAllWeddingEventsDto>,
  res: Response,
): Promise<Response> => {
  const { user, query } = req;

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;

  await getUserWeddingService(user.id, query.weddingId);

  const events = await getAllWeddingEventsService(query.weddingId, page, limit);

  return sendSuccess(res, "Events fetched successfully", events, 200);
};

export const addNewWeddingEvent = async (
  req: Request<{}, {}, AddNewWeddingEventDto>,
  res: Response,
): Promise<Response> => {
  const { user, body } = req;

  await getUserWeddingService(user.id, body.weddingId);

  const event = await addNewWeddingEventService({
    ...body,
    wedding_id: body.weddingId,
    event_side: body.eventSide,
  });

  return sendSuccess(res, "Event created successfully", event, 201);
};

export const getWeddingEvent = async (
  req: Request<GetWeddingEventDto>,
  res: Response,
): Promise<Response> => {
  const { user, params } = req;

  const event = await getWeddingEventService(params.id, user.id);

  return sendSuccess(res, "Event fetched successfully", event, 200);
};

export const editWeddingEvent = async (
  req: Request<EditWeddingEventDto["params"], {}, EditWeddingEventDto["body"]>,
  res: Response,
): Promise<Response> => {
  const { user, params, body } = req;

  const event = await editWeddingEventService(params.id, user.id, {
    ...body,
    event_side: body.eventSide,
  });

  return sendSuccess(res, "Event updated successfully", event, 200);
};

export const deleteWeddingEvent = async (
  req: Request<GetWeddingEventDto>,
  res: Response,
) => {
  const { user, params } = req;

  await deleteWeddingEventService(params.id, user.id);

  return sendSuccess(res, "Event deleted successfully", {}, 200);
};
