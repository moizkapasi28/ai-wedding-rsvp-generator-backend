import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

export const getAiInviteCardsByWedding = async (
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
        aiEventInviteCard: true,
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

export const createAiEventInviteCard = async (
  data: Prisma.AIEventInviteCardUncheckedCreateInput,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.aIEventInviteCard.create({ data });
};

export const findAiEventInviteCardById = async (
  id: string,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.aIEventInviteCard.findUnique({ where: { id } });
};

export const updateAiEventInviteCard = async (
  id: string,
  payload: Prisma.AIEventInviteCardUpdateInput,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.aIEventInviteCard.update({ where: { id }, data: payload });
};
