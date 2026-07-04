import { type Request, type Response } from "express";
import {
  AddNewWeddingEventDto,
  EditWeddingEventDto,
  GetAllWeddingEventsDto,
  GetWeddingEventDto,
} from "../validations/event.validations";
import { sendSuccess } from "../utils/response.util";
import {
  addNewWeddingEventService,
  getAllWeddingEventsService,
  verifyWeddingEventOwnershipService,
  getWeddingEventService,
  editWeddingEventService,
  deleteWeddingEventService,
} from "../services/event.service";
import { getUserWeddingService } from "../services/wedding.service";

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
  });

  return sendSuccess(res, "Event created successfully", event, 201);
};

export const getWeddingEvent = async (
  req: Request<GetWeddingEventDto>,
  res: Response,
): Promise<Response> => {
  const { user, params } = req;

  await verifyWeddingEventOwnershipService(params.id, user.id);

  const event = await getWeddingEventService(params.id);

  return sendSuccess(res, "Event fetched successfully", event, 200);
};

export const editWeddingEvent = async (
  req: Request<EditWeddingEventDto["params"], {}, EditWeddingEventDto["body"]>,
  res: Response,
): Promise<Response> => {
  const { user, params, body } = req;

  await verifyWeddingEventOwnershipService(params.id, user.id);

  const event = await editWeddingEventService(params.id, body);

  return sendSuccess(res, "Event updated successfully", event, 200);
};

export const deleteWeddingEvent = async (
  req: Request<GetWeddingEventDto>,
  res: Response,
) => {
  const { user, params } = req;

  await verifyWeddingEventOwnershipService(params.id, user.id);

  await deleteWeddingEventService(params.id);

  return sendSuccess(res, "Event deleted successfully", {}, 200);
};
