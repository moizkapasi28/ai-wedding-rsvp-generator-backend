import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

export const getInviteCardsByWedding = async (
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
        inviteCard: true,
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
  data: Prisma.EventInviteCardUncheckedCreateInput,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.eventInviteCard.create({ data });
};

export const findAiEventInviteCardById = async (
  id: string,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.eventInviteCard.findUnique({ where: { id } });
};

export const findAiEventInviteCardByEventId = async (
  eventId: string,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.eventInviteCard.findUnique({ where: { event_id: eventId } });
};

const IN_FLIGHT_STATUSES = ["QUEUED", "PROCESSING"] as const;

// Every card with a generation under way, with the user it belongs to
export const findInFlightInviteCards = () =>
  prisma.eventInviteCard.findMany({
    where: { generation_status: { in: [...IN_FLIGHT_STATUSES] } },
    include: { event: { select: { wedding: { select: { user_id: true } } } } },
  });

// Only touches a card that is still in flight, so a run that finished (or was already
// failed by someone else) in the meantime is left as it is. `count` says which happened.
export const updateInFlightInviteCard = (
  id: string,
  payload: Prisma.EventInviteCardUpdateManyMutationInput,
) =>
  prisma.eventInviteCard.updateMany({
    where: { id, generation_status: { in: [...IN_FLIGHT_STATUSES] } },
    data: payload,
  });

export const updateAiEventInviteCard = async (
  id: string,
  payload: Prisma.EventInviteCardUpdateInput,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;
  return db.eventInviteCard.update({
    where: { id },
    data: payload,
  });
};
