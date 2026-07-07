import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

export const createGuest = async (
  payload: Prisma.GuestUncheckedCreateInput,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;

  return db.guest.create({ data: payload });
};

export const createGuestEventInvite = async (
  payload: Prisma.GuestEventInviteUncheckedCreateInput,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;

  return db.guestEventInvite.create({ data: payload });
};
