import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

export const createToken = (payload: Prisma.TokenUncheckedCreateInput) => {
  return prisma.token.create({ data: payload });
};
