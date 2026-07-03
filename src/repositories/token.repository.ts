import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

export const createToken = (
  payload: Prisma.TokenUncheckedCreateInput,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.token.create({ data: payload });
};

export const findTokenByJti = (jti: string, tx?: Prisma.TransactionClient) => {
  const db = tx || prisma;

  return db.token.findFirst({ where: { jti } });
};

export const deleteTokenByJti = (jti: string, tx?: Prisma.TransactionClient) => {
  const db = tx || prisma;

  return db.token.deleteMany({ where: { jti } });
};
