import { Prisma, Wedding } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

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
  tx?: Prisma.TransactionClient,
): Promise<number> => {
  const db = tx || prisma;
  return db.wedding.count({ where: { user_id: userId } });
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
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;

  return db.wedding.findMany({
    where: { user_id: userId },
    skip,
    take,
    orderBy: { created_at: "desc" },
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
