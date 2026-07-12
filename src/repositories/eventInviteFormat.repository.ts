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

export const findGuestEventInviteFormatById = (
  id: string,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.guestEventInviteFormat.findFirst({ where: { id } });
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
