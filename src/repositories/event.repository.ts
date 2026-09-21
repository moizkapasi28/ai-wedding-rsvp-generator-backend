import { Prisma, Event, EventSide } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

export type EventSort = "newest" | "date_asc" | "date_desc";

export interface EventFilters {
  search?: string;
  sides?: EventSide[];
  sort?: EventSort;
}

const buildEventWhereInput = (
  weddingId: string,
  filters: EventFilters = {},
): Prisma.EventWhereInput => {
  const where: Prisma.EventWhereInput = { wedding_id: weddingId };

  const term = filters.search?.trim();
  if (term) {
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { venue: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
    ];
  }

  if (filters.sides?.length) {
    where.event_side = { in: filters.sides };
  }

  return where;
};

const buildEventOrderBy = (
  sort: EventSort = "newest",
): Prisma.EventOrderByWithRelationInput =>
  sort === "date_asc"
    ? { date: "asc" }
    : sort === "date_desc"
      ? { date: "desc" }
      : { created_at: "desc" };

export const getAllWeddingEvents = async (
  weddingId: string,
  skip: number,
  take: number,
  filters: EventFilters = {},
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;

  return db.event.findMany({
    where: buildEventWhereInput(weddingId, filters),
    skip,
    take,
    orderBy: buildEventOrderBy(filters.sort),
  });
};

export const countWeddingEvents = async (
  weddingId: string,
  filters: EventFilters = {},
  tx?: Prisma.TransactionClient,
): Promise<number> => {
  const db = tx || prisma;
  return db.event.count({ where: buildEventWhereInput(weddingId, filters) });
};

export const createEvent = async (
  data: Prisma.EventUncheckedCreateInput,
  tx?: Prisma.TransactionClient,
): Promise<Event> => {
  const db = tx || prisma;
  return db.event.create({ data });
};

export const findEventByIdAndUserId = async (
  eventId: string,
  userId: string,
  tx?: Prisma.TransactionClient,
): Promise<Event | null> => {
  const db = tx || prisma;
  return db.event.findFirst({
    where: {
      id: eventId,
      wedding: {
        user_id: userId,
      },
    }
  });
};

export const findEventById = async (
  eventId: string,
  tx?: Prisma.TransactionClient,
): Promise<Event | null> => {
  const db = tx || prisma;
  return db.event.findUnique({
    where: {
      id: eventId,
    },
  });
};

export const updateWeddingEventById = async (
  id: string,
  data: Prisma.EventUpdateInput,
  tx?: Prisma.TransactionClient,
): Promise<Event> => {
  const db = tx || prisma;
  return db.event.update({
    where: { id },
    data: { ...data, updated_at: new Date() },
  });
};

export const deleteWeddingEventById = async (
  id: string,
  tx?: Prisma.TransactionClient,
): Promise<Event> => {
  const db = tx || prisma;
  return db.event.delete({ where: { id } });
};

export const getGuestStatsForEvents = async (
  eventIds: string[],
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.guestEventInvite.groupBy({
    by: ["event_id", "status"],
    where: {
      event_id: { in: eventIds },
    },
    _count: {
      status: true,
    },
  });
};

export const getAllEventsByWeddingID = async (
  weddingId: string,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.event.findMany({
    where: { wedding_id: weddingId },
    orderBy: { date: "asc" },
  });
};
