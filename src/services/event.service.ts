import { Event, Prisma } from "../../generated/prisma/client";

import {
  countWeddingEvents,
  createEvent,
  getAllWeddingEvents,
  findEventByIdAndUserId,
  findEventById,
  updateWeddingEventById,
  deleteWeddingEventById,
} from "../repositories/event.repository";
import { ApiError } from "../utils/apiError.util";

import {
  AddNewWeddingEventDto,
  EditWeddingEventDto,
} from "../validations/event.validations";

export const getAllWeddingEventsService = async (
  weddingId: string,
  page: number = 1,
  limit: number = 10,
): Promise<{
  events: Event[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}> => {
  const skip = (page - 1) * limit;

  const [data, totalCount] = await Promise.all([
    getAllWeddingEvents(weddingId, skip, limit),
    countWeddingEvents(weddingId),
  ]);

  return {
    events: data,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
  };
};

export const addNewWeddingEventService = async (
  data: Prisma.EventUncheckedCreateInput,
): Promise<Event> => {
  const event = await createEvent({
    wedding_id: data.wedding_id,
    title: data.title,
    description: data.description,
    date: new Date(data.date),
    time: data.time,
    venue: data.venue,
    city: data.city,
  });

  if (!event) throw new ApiError(400, "Failed to create event");

  return event;
};

export const verifyWeddingEventOwnershipService = async (
  eventId: string,
  userId: string,
): Promise<void> => {
  const event = await findEventByIdAndUserId(eventId, userId);

  if (!event) throw new ApiError(404, "Event not found");
};

export const getWeddingEventService = async (
  eventId: string,
): Promise<Event> => {
  const event = await findEventById(eventId);

  if (!event) throw new ApiError(404, "Event not found");

  return event;
};

export const editWeddingEventService = async (
  id: string,
  payload: Prisma.EventUpdateInput,
): Promise<Event> => {
  if (payload.date) {
    payload.date = new Date(payload.date as string);
  }

  const event = await updateWeddingEventById(id, payload);

  if (!event) throw new ApiError(400, "Failed to update event");

  return event;
};

export const deleteWeddingEventService = async (
  eventId: string,
): Promise<void> => {
  const event = await deleteWeddingEventById(eventId);

  if (!event) throw new ApiError(400, "Failed to delete event");
};
