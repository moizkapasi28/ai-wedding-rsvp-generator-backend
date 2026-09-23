import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError.util";

// One charge per generation, however many Gemini calls and retries it takes.
// Mirrored in the frontend's src/constants/index.ts.
export const AI_CREDIT_COST = {
  INVITE_CARD: 10,
  HEADER_IMAGE: 5,
} as const;

// The balance check lives in the WHERE, so concurrent requests can never
// take a balance below zero.
export const spendCredits = async (
  userId: string,
  cost: number,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  const { count } = await db.user.updateMany({
    where: { id: userId, ai_credits: { gte: cost } },
    data: { ai_credits: { decrement: cost } },
  });

  if (!count)
    throw new ApiError(
      402,
      `Not enough AI credits. This needs ${cost} credits.`,
    );
};

export const refundCredits = async (
  userId: string,
  amount: number,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  await db.user.update({
    where: { id: userId },
    data: { ai_credits: { increment: amount } },
  });
};

// Both the worker and the stale-job sweep can fail a card; clearing
// credits_charged conditionally means only the first one refunds.
export const refundInviteCardCredits = (cardId: string, userId: string) =>
  prisma.$transaction(async (tx) => {
    const card = await tx.eventInviteCard.findUnique({
      where: { id: cardId },
      select: { credits_charged: true },
    });
    if (!card?.credits_charged) return;

    const { count } = await tx.eventInviteCard.updateMany({
      where: { id: cardId, credits_charged: card.credits_charged },
      data: { credits_charged: 0 },
    });
    if (count) await refundCredits(userId, card.credits_charged, tx);
  });
