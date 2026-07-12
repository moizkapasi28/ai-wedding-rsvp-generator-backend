import { Event, Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

import {
  countWeddingEvents,
  createEvent,
  deleteWeddingEventById,
  findEventById,
  findEventByIdAndUserId,
  getAllWeddingEvents,
  updateWeddingEventById,
} from "../repositories/event.repository";
import { createGuestEventInviteFormat } from "../repositories/eventInviteFormat.repository";
import { ApiError } from "../utils/apiError.util";

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
  return prisma.$transaction(async (tx) => {
    const event = await createEvent(
      {
        wedding_id: data.wedding_id,
        title: data.title,
        description: data.description,
        event_side: data.event_side,
        date: new Date(data.date),
        time: data.time,
        venue: data.venue,
        address: data.address,
        city: data.city,
      },
      tx,
    );

    if (!event) throw new ApiError(400, "Failed to create event");

    const eventInviteFormat = await createGuestEventInviteFormat(
      { event_id: event.id },
      tx,
    );

    if (!eventInviteFormat)
      throw new ApiError(400, "Failed to create event invite format");

    return event;
  });
};

export const verifyWeddingEventOwnershipService = async (
  eventId: string,
  userId: string,
): Promise<Event | null> => {
  const event = await findEventByIdAndUserId(eventId, userId);

  return event;
};

export const getWeddingEventService = async (
  eventId: string,
  userId: string,
): Promise<Event> => {
  const ownershipEvent = await verifyWeddingEventOwnershipService(
    eventId,
    userId,
  );

  if (!ownershipEvent)
    throw new ApiError(400, "Invalid Event or Event Not Found");

  const event = await findEventById(eventId);

  if (!event) throw new ApiError(404, "Event not found");

  return event;
};

export const editWeddingEventService = async (
  id: string,
  userId: string,
  payload: Prisma.EventUpdateInput,
): Promise<Event> => {
  const ownershipEvent = await verifyWeddingEventOwnershipService(id, userId);

  if (!ownershipEvent)
    throw new ApiError(400, "Invalid Event or Event Not Found");

  if (payload.date) {
    payload.date = new Date(payload.date as string);
  }

  const event = await updateWeddingEventById(id, payload);

  if (!event) throw new ApiError(400, "Failed to update event");

  return event;
};

export const deleteWeddingEventService = async (
  eventId: string,
  userId: string,
): Promise<void> => {
  const ownershipEvent = await verifyWeddingEventOwnershipService(
    eventId,
    userId,
  );

  if (!ownershipEvent)
    throw new ApiError(400, "Invalid Event or Event Not Found");

  const event = await deleteWeddingEventById(eventId);

  if (!event) throw new ApiError(400, "Failed to delete event");
};
