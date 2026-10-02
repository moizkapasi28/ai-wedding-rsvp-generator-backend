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

export const deleteTokenByJti = (
  jti: string,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;

  return db.token.deleteMany({ where: { jti } });
};

export const deleteTokensBySessionId = (
  sessionId: string,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;

  return db.token.deleteMany({ where: { session_id: sessionId } });
};

export const deleteExpiredTokensByUserId = (
  userId: string,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;

  return db.token.deleteMany({
    where: { user_id: userId, expires_at: { lt: new Date() } },
  });
};

export const deleteTokensByUserId = async (
  userId: string,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;

  return db.token.deleteMany({ where: { user_id: userId } });
};
