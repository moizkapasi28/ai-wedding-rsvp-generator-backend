import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

const inviteReplySelect = {
  id: true,
  status: true,
  plus_ones: true,
  dietary: true,
  song_request: true,
  message: true,
  invite_deadline: true,
  responded_at: true,
} satisfies Prisma.GuestEventInviteSelect;

export const findInviteByToken = async (
  token: string,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;

  return db.guestEventInvite.findUnique({
    where: { invite_token: token },
    select: {
      ...inviteReplySelect,
      guest: { select: { name: true } },
      event: {
        select: {
          id: true,
          wedding_id: true,
          title: true,
          description: true,
          date: true,
          time: true,
          venue: true,
          address: true,
          city: true,
          latitude: true,
          longitude: true,
          event_side: true,
          wedding: { select: { bride_name: true, groom_name: true } },
        },
      },
      invite_format: {
        select: {
          dietary_preference: true,
          plus_ones: true,
          song_request: true,
          message: true,
        },
      },
    },
  });
};

export const updateRsvpInvite = async (
  inviteId: string,
  data: Prisma.GuestEventInviteUpdateInput,
  tx?: Prisma.TransactionClient,
) => {
  const db = tx || prisma;

  return db.guestEventInvite.update({
    where: { id: inviteId },
    data: { ...data, updated_at: new Date() },
    select: inviteReplySelect,
  });
};
