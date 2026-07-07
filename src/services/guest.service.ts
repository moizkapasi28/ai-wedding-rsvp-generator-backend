import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import {
  createGuest,
  createGuestEventInvite,
} from "../repositories/guest.repository";
import { v4 as uuidv4 } from "uuid";

export const addNewGuestService = async (
  payload: Prisma.GuestUncheckedCreateInput,
  eventId: string,
) => {
  return prisma.$transaction(async (tx) => {
    const guest = await createGuest(payload, tx);

    if (!guest) throw new Error("Failed to create guest");

    const inviteToken = uuidv4();
    const guestInvitePayload: Prisma.GuestEventInviteUncheckedCreateInput = {
      event_id: eventId,
      guest_id: guest.id,
      invite_token: inviteToken,
      plus_ones: null,
      dietary: null,
      invite_deadline: null,
      responded_at: null,
    };
    const guestEventInvite = await createGuestEventInvite(
      guestInvitePayload,
      tx,
    );

    if (!guestEventInvite)
      throw new Error("Failed to create guest event invite");

    return guest;
  });
};
