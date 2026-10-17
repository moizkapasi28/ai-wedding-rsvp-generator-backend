import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/apiError.util";

// One charge per generation, however many Gemini calls and retries it takes.
// Sent to the frontend as ai_credit_costs on GET /auth/me (its src/constants copy is only a fallback).
export const AI_CREDIT_COST = {
  INVITE_CARD: 10,
  HEADER_IMAGE: 5,
} as const;

// A balance change and its ledger row commit together: in the caller's transaction, or a new one
const withTx = <T>(
  tx: Prisma.TransactionClient | undefined,
  run: (db: Prisma.TransactionClient) => Promise<T>,
) => (tx ? run(tx) : prisma.$transaction(run));

// The balance check lives in the WHERE, so concurrent requests can never
// take a balance below zero.
export const spendCredits = (
  userId: string,
  reason: keyof typeof AI_CREDIT_COST,
  refId: string,
  tx?: Prisma.TransactionClient,
) =>
  withTx(tx, async (db) => {
    const cost = AI_CREDIT_COST[reason];
    const { count } = await db.user.updateMany({
      where: { id: userId, ai_credits: { gte: cost } },
      data: { ai_credits: { decrement: cost } },
    });

    if (!count)
      throw new ApiError(
        402,
        `Not enough AI credits. This needs ${cost} credits.`,
      );

    await db.creditTransaction.create({
      data: { user_id: userId, delta: -cost, reason, ref_id: refId },
    });
  });

export const refundCredits = (
  userId: string,
  amount: number,
  refId: string,
  tx?: Prisma.TransactionClient,
) =>
  withTx(tx, async (db) => {
    await db.user.update({
      where: { id: userId },
      data: { ai_credits: { increment: amount } },
    });
    await db.creditTransaction.create({
      data: { user_id: userId, delta: amount, reason: "REFUND", ref_id: refId },
    });
  });

// For admins (scripts/grant-credits.ts): a top-up with a note saying why
// ponytail: positive grants only; take credits back with SQL plus a ledger row if that's ever needed
export const grantCredits = async (
  userId: string,
  amount: number,
  note: string,
) => {
  if (!Number.isInteger(amount) || amount <= 0)
    throw new Error("Grant a whole number of credits above zero");

  return prisma.$transaction(async (db) => {
    const user = await db.user.update({
      where: { id: userId },
      data: { ai_credits: { increment: amount } },
      select: { ai_credits: true },
    });
    await db.creditTransaction.create({
      data: { user_id: userId, delta: amount, reason: "GRANT", note },
    });
    return user.ai_credits;
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
    if (count) await refundCredits(userId, card.credits_charged, cardId, tx);
  });
