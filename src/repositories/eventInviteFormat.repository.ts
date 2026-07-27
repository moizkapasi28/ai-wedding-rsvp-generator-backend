import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

export const createGuestEventInviteFormat = (
  data: Prisma.GuestEventInviteFormatUncheckedCreateInput,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.guestEventInviteFormat.create({ data });
};

export const findGuestEventInviteFormatByEventId = (
  eventId: string,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.guestEventInviteFormat.findFirst({ where: { event_id: eventId } });
};

export const getGuestEventInviteFormatsByWedding = async (
  weddingId: string,
  page: number,
  limit: number,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  const skip = (page - 1) * limit;

  const [events, total] = await Promise.all([
    db.event.findMany({
      where: { wedding_id: weddingId },
      include: {
        guestEventInviteFormat: true,
        wedding: true,
      },
      skip,
      take: limit,
      orderBy: { created_at: "asc" },
    }),
    db.event.count({
      where: { wedding_id: weddingId },
    }),
  ]);

  return {
    events,
    totalCount: total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  };
};

export const findGuestEventInviteFormatById = (
  id: string,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.guestEventInviteFormat.findFirst({
    where: { id },
    include: { event: true },
  });
};

export const updateGuestEventInviteFormat = async (
  id: string,
  payload: Prisma.GuestEventInviteFormatUpdateInput,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.guestEventInviteFormat.update({
    where: { id },
    data: { ...payload, updated_at: new Date() },
  });
};
