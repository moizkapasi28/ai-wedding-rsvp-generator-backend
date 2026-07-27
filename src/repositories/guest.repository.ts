import { Group, Prisma, Side } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { sanitizeSearchTerm } from "../utils/utils";

//* Utility functions for guest repository

const buildGuestWhereInput = (
  weddingId: string,
  eventId?: string,
  search?: string,
  events?: string[],
  sides?: Side[],
  groups?: Group[],
): Prisma.GuestWhereInput => {
  const where: Prisma.GuestWhereInput = { wedding_id: weddingId };
  const andConditions: Prisma.GuestWhereInput[] = [];

  if (eventId) {
    andConditions.push({
      guestEventInvite: {
        some: { event_id: eventId },
      },
    });
  }

  if (search && search.trim()) {
    const tsQuery = sanitizeSearchTerm(search);
    const searchOr: Prisma.GuestWhereInput[] = [];

    if (tsQuery) {
      searchOr.push(
        { name: { search: tsQuery } },
        { email: { search: tsQuery } },
      );
    }

    const term = search.trim();
    searchOr.push({ mobile_number: { contains: term, mode: "insensitive" } });

    if (searchOr.length) {
      andConditions.push({ OR: searchOr });
    }
  }

  if (events && events.length) {
    andConditions.push({
      guestEventInvite: {
        some: { event_id: { in: events } },
      },
    });
  }

  if (sides && sides.length) {
    andConditions.push({
      side: { in: sides },
    });
  }

  if (groups && groups.length) {
    andConditions.push({
      group: { in: groups },
    });
  }

  if (andConditions.length) {
    where.AND = andConditions;
  }

  return where;
};

//* Repository functions for data fetching

export const findAllGuests = async (
  weddingId: string,
  eventId: string | undefined,
  page: number,
  limit: number,
  search?: string,
  events?: string[],
  sides?: Side[],
  groups?: Group[],
) => {
  const db = prisma;
  const skip = (page - 1) * limit;

  const where: Prisma.GuestWhereInput = buildGuestWhereInput(
    weddingId,
    eventId,
    search,
    events,
    sides,
    groups,
  );

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
            plus_ones: true,
            dietary: true,
            song_request: true,
            message: true,
            invite_deadline: true,
            responded_at: true,
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

export const deleteGuestsWithNoEvents = async (
  weddingId: string,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.guest.deleteMany({
    where: {
      wedding_id: weddingId,
      guestEventInvite: {
        none: {},
      },
    },
  });
};

export const getEventGuestStats = async (
  eventIds: string[],
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;

  const inviteStats = await db.guestEventInvite.groupBy({
    by: ["event_id", "status"],
    where: {
      event_id: { in: eventIds },
    },
    _count: {
      _all: true,
    },
  });

  const statsMap: Record<
    string,
    { total: number; PENDING: number; ATTENDING: number; DECLINED: number; MAYBE: number }
  > = {};

  for (const eventId of eventIds) {
    statsMap[eventId] = {
      total: 0,
      PENDING: 0,
      ATTENDING: 0,
      DECLINED: 0,
      MAYBE: 0,
    };
  }

  for (const stat of inviteStats) {
    if (stat.status in statsMap[stat.event_id]) {
      statsMap[stat.event_id][
        stat.status as keyof Omit<typeof statsMap[string], "total">
      ] = stat._count._all;
      statsMap[stat.event_id].total += stat._count._all;
    }
  }

  return statsMap;
};
