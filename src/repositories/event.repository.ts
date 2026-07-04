import { Prisma, Event } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

export const getAllWeddingEvents = async (
  weddingId: string,
  skip: number,
  take: number,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;

  return db.event.findMany({
    where: { wedding_id: weddingId },
    skip,
    take,
    orderBy: { created_at: "desc" },
  });
};

export const countWeddingEvents = async (
  weddingId: string,
  tx?: Prisma.TransactionClient,
): Promise<number> => {
  const db = tx || prisma;
  return db.event.count({ where: { wedding_id: weddingId } });
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
    },
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
