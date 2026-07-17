import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

export const findAllGuests = async (
  weddingId: string,
  eventId: string | undefined,
  page: number,
  limit: number,
) => {
  const db = prisma;
  const skip = (page - 1) * limit;

  const where: Prisma.GuestWhereInput = {
    wedding_id: weddingId,
    ...(eventId && {
      guestEventInvite: {
        some: { event_id: eventId },
      },
    }),
  };

  const [guests, total] = await Promise.all([
    db.guest.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        mobile_number: true,
        side: true,
        group: true,
        accomodation_required: true,
        accomodation_address: true,
        note: true,
        created_at: true,
        updated_at: true,
        guestEventInvite: {
          select: {
            id: true,
            status: true,
            created_at: true,
            updated_at: true,
            event: {
              select: {
                id: true,
                title: true,
                event_side: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    db.guest.count({ where }),
  ]);

  return { guests, total };
};

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

export const getWeddingGuest = async (
  guestId: string,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.guest.findFirst({
    where: { id: guestId },
    include: {
      guestEventInvite: {
        orderBy: { created_at: "desc" },
        include: { event: true },
      },
    },
  });
};

export const findGuestByMobileNumber = async (
  mobileNumber: string,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.guest.findFirst({ where: { mobile_number: mobileNumber } });
};

export const findGuestByMobileNumberAndWeddingId = async (
  mobileNumber: string,
  weddingId: string,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.guest.findFirst({
    where: { mobile_number: mobileNumber, wedding_id: weddingId },
  });
};

export const deleteGuest = async (
  guestId: string,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.guest.delete({ where: { id: guestId } });
};

export const updateGuest = async (
  guestId: string,
  payload: Prisma.GuestUpdateInput,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.guest.update({ where: { id: guestId }, data: payload });
};

export const findGuestEventInvitesByGuestId = async (
  guestId: string,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.guestEventInvite.findMany({ where: { guest_id: guestId } });
};

export const deleteGuestEventInvitesByEventIds = async (
  guestId: string,
  eventIds: string[],
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.guestEventInvite.deleteMany({
    where: { guest_id: guestId, event_id: { in: eventIds } },
  });
};

export const getGuestsConfirmationStats = async (
  weddingId: string,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;

  const [totalInvites, confirmedInvites] = await Promise.all([
    db.guestEventInvite.count({
      where: {
        event: { wedding_id: weddingId },
      },
    }),
    db.guestEventInvite.count({
      where: {
        event: { wedding_id: weddingId },
        status: "ATTENDING",
      },
    }),
  ]);

  return [totalInvites, confirmedInvites];
};
