import { Prisma, Wedding } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { sanitizeSearchTerm } from "../utils/utils";

//* Utility functions for wedding repository

const buildWeddingWhere = (
  userId: string,
  search?: string,
  filter?: string,
): Prisma.WeddingWhereInput => {
  const where: Prisma.WeddingWhereInput = { user_id: userId };
  const andConditions: Prisma.WeddingWhereInput[] = [];

  if (filter) {
    const filters = filter
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const endOfThisWeek = new Date(startOfToday);
    endOfThisWeek.setDate(endOfThisWeek.getDate() + 7);

    const filterOr: Prisma.WeddingWhereInput[] = [];

    if (filters.includes("completed")) {
      filterOr.push({ date: { lt: startOfToday } });
    }
    if (filters.includes("this_week")) {
      filterOr.push({ date: { gte: startOfToday, lte: endOfThisWeek } });
    }
    if (filters.includes("upcoming")) {
      filterOr.push({ date: { gt: endOfThisWeek } });
    }

    if (filterOr.length) {
      andConditions.push({ OR: filterOr });
    }
  }

  if (search && search.trim()) {
    const tsQuery = sanitizeSearchTerm(search);
    const searchOr: Prisma.WeddingWhereInput[] = [];

    if (tsQuery) {
      searchOr.push(
        { title: { search: tsQuery } },
        { city: { search: tsQuery } },
        { venue: { search: tsQuery } },
        { groom_name: { search: tsQuery } },
        { bride_name: { search: tsQuery } },
      );
    }

    const parsedDate = new Date(search.trim());
    if (!isNaN(parsedDate.getTime())) {
      const dayStart = new Date(
        parsedDate.getFullYear(),
        parsedDate.getMonth(),
        parsedDate.getDate(),
      );
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      searchOr.push({ date: { gte: dayStart, lt: dayEnd } });
    }

    andConditions.push({ OR: searchOr });
  }

  if (andConditions.length) {
    where.AND = andConditions;
  }

  return where;
};

const buildWeddingOrderBy = (
  sortBy: "date" | "created_at" = "created_at",
  sortOrder: "asc" | "desc" = "desc",
): Prisma.WeddingOrderByWithRelationInput => {
  const sortableFields: Record<
    string,
    keyof Prisma.WeddingOrderByWithRelationInput
  > = {
    date: "date",
    created_at: "created_at",
  };

  const field = sortableFields[sortBy] ?? "date";
  return { [field]: sortOrder };
};

//* Repository functions for data fetching

export const getAllUserWeddings = async (
  userId: string,
  skip: number,
  take: number,
  tx?: Prisma.TransactionClient,
): Promise<Wedding[]> => {
  const db = tx || prisma;

  return db.wedding.findMany({
    where: { user_id: userId },
    skip,
    take,
    orderBy: { created_at: "desc" },
  });
};

export const countUserWeddings = async (
  userId: string,
  search?: string,
  filter?: string,
  tx?: Prisma.TransactionClient,
): Promise<number> => {
  const db = tx || prisma;
  return db.wedding.count({
    where: buildWeddingWhere(userId, search, filter),
  });
};

export const createWedding = async (
  data: Prisma.WeddingUncheckedCreateInput,
  tx?: Prisma.TransactionClient,
): Promise<Wedding> => {
  const db = tx || prisma;
  return db.wedding.create({ data });
};

export const findWeddingById = async (
  id: string,
  tx?: Prisma.TransactionClient,
): Promise<Wedding | null> => {
  const db = tx || prisma;
  return db.wedding.findUnique({ where: { id } });
};

export const findWeddingByIdAndUserId = async (
  id: string,
  userId: string,
  tx?: Prisma.TransactionClient,
): Promise<Wedding | null> => {
  const db = tx || prisma;
  return db.wedding.findUnique({ where: { id, user_id: userId } });
};

export const updateWeddingById = async (
  id: string,
  data: Prisma.WeddingUpdateInput,
  tx?: Prisma.TransactionClient,
): Promise<Wedding> => {
  const db = tx || prisma;
  return db.wedding.update({
    where: { id },
    data: { ...data, updated_at: new Date() },
  });
};

export const deleteWeddingById = async (
  id: string,
  tx?: Prisma.TransactionClient,
): Promise<Wedding> => {
  const db = tx || prisma;
  return db.wedding.delete({ where: { id } });
};

export const getAllWeddingsWithEventCountAndTotalGuest = async (
  userId: string,
  skip: number,
  take: number,
  search?: string,
  filter?: string,
  sortBy: "date" | "created_at" = "created_at",
  sortOrder: "asc" | "desc" = "desc",
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;

  return db.wedding.findMany({
    where: buildWeddingWhere(userId, search, filter),
    skip,
    take,
    orderBy: buildWeddingOrderBy(sortBy, sortOrder),

    include: {
      _count: {
        select: {
          events: true,
          guests: true,
        },
      },
    },
  });
};

export const getWeddingDashboardCounts = async (
  weddingId: string,
  since: Date,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  const inviteWhere: Prisma.GuestEventInviteWhereInput = {
    event: { wedding_id: weddingId },
  };

  return Promise.all([
    db.guest.count({ where: { wedding_id: weddingId } }),
    db.guest.count({
      where: { wedding_id: weddingId, created_at: { gte: since } },
    }),
    db.guest.count({
      where: { wedding_id: weddingId, accomodation_required: true },
    }),
    db.guest.groupBy({
      by: ["side"],
      where: { wedding_id: weddingId },
      _count: { _all: true },
    }),
    db.guestEventInvite.groupBy({
      by: ["dietary"],
      where: { ...inviteWhere, status: "ATTENDING", dietary: { not: null } },
      _count: { _all: true },
    }),
    db.guestEventInvite.findMany({
      where: { ...inviteWhere, responded_at: { gte: since } },
      select: { responded_at: true },
    }),
  ]);
};

export const getRecentRsvps = async (
  weddingId: string,
  take: number,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;

  return db.guestEventInvite.findMany({
    where: { event: { wedding_id: weddingId }, responded_at: { not: null } },
    orderBy: { responded_at: "desc" },
    take,
    select: {
      id: true,
      status: true,
      plus_ones: true,
      responded_at: true,
      guest: { select: { name: true } },
      event: { select: { title: true } },
    },
  });
};
