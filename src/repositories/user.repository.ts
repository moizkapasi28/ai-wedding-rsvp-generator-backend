import { Prisma, User } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

export const findUserByEmail = async (email: string, tx?: Prisma.TransactionClient): Promise<User | null> => {
  const db = tx || prisma;
  return db.user.findUnique({
    where: { email },
  });
};

export const createUser = async (
  payload: Prisma.UserCreateInput,
  tx?: Prisma.TransactionClient
): Promise<User> => {
  const db = tx || prisma;
  return db.user.create({
    data: payload,
  });
};

export const findUserById = async (
  userId: string,
  tx?: Prisma.TransactionClient
): Promise<User | null> => {
  const db = tx || prisma;
  return db.user.findUnique({
    where: { id: userId },
  });
};

export const updateUserById = async (
  userId: string,
  payload: Prisma.UserUpdateInput,
  tx?: Prisma.TransactionClient
): Promise<User> => {
  const db = tx || prisma;
  return db.user.update({
    where: { id: userId },
    data: payload,
  });
};
