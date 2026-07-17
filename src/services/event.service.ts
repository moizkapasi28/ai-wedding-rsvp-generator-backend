import { Event, Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

import {
  countWeddingEvents,
  createEvent,
  deleteWeddingEventById,
  findEventById,
  findEventByIdAndUserId,
  getAllWeddingEvents,
  getGuestStatsForEvents,
  updateWeddingEventById,
} from "../repositories/event.repository";
import { createGuestEventInviteFormat } from "../repositories/eventInviteFormat.repository";
import { ApiError } from "../utils/apiError.util";
import {
  EventStats,
  EventWithStats,
  GuestStatQueryGroup,
} from "../types/event.type";
import { STATUS } from "../enums/event.enum";

export const mapGuestStatsToEvents = (
  events: Event[],
  guestStats: GuestStatQueryGroup[],
): EventWithStats[] => {
  const statsMap = new Map<string, Omit<EventStats, "completion" | "progressBar">>();

  for (const stat of guestStats) {
    if (!statsMap.has(stat.event_id)) {
      statsMap.set(stat.event_id, {
        totalGuests: 0,
        attendingGuests: 0,
        declinedGuests: 0,
        maybeGuests: 0,
        pendingGuests: 0,
      });
    }

    const eventStat = statsMap.get(stat.event_id);
    const count = stat._count.status;

    eventStat.totalGuests += count;

    if (stat.status === STATUS.ATTENDING) eventStat.attendingGuests += count;
    else if (stat.status === STATUS.DECLINED) eventStat.declinedGuests += count;
    else if (stat.status === STATUS.MAYBE) eventStat.maybeGuests += count;
    else if (stat.status === STATUS.PENDING) eventStat.pendingGuests += count;
  }

  return events.map((event) => {
    const rawStats = statsMap.get(event.id) || {
      totalGuests: 0,
      attendingGuests: 0,
      declinedGuests: 0,
      maybeGuests: 0,
      pendingGuests: 0,
    };

    const getPercentage = (count: number) =>
      rawStats.totalGuests === 0 ? 0 : Math.round((count / rawStats.totalGuests) * 100);

    const completion = getPercentage(
      rawStats.attendingGuests + rawStats.declinedGuests + rawStats.maybeGuests
    );

    const stats = {
      ...rawStats,
      completion,
      progressBar: {
        confirmed: getPercentage(rawStats.attendingGuests),
        maybe: getPercentage(rawStats.maybeGuests),
        declined: getPercentage(rawStats.declinedGuests),
        pending: getPercentage(rawStats.pendingGuests),
      },
    };

    return {
      ...event,
      stats,
    };
  });
};

export const getAllWeddingEventsService = async (
  weddingId: string,
  page: number = 1,
  limit: number = 10,
  includeStats: boolean = false,
): Promise<{
  events: EventWithStats[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}> => {
  const skip = (page - 1) * limit;

  if (includeStats) {
    const [data, totalCount] = await Promise.all([
      getAllWeddingEvents(weddingId, skip, limit),
      countWeddingEvents(weddingId),
    ]);

    const eventIds = data.map((e) => e.id);
    const guestStats = await getGuestStatsForEvents(eventIds);

    const eventsWithStats = mapGuestStatsToEvents(data, guestStats);

    return {
      events: eventsWithStats,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    };
  } else {
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
  }
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
        latitude: data.latitude,
        longitude: data.longitude,
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
