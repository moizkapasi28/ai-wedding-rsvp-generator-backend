import { Guest, Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import {
  createGuest,
  createGuestEventInvite,
  deleteGuest,
  findAllGuests,
  findGuestByMobileNumberAndWeddingId,
  getWeddingGuest,
} from "../repositories/guest.repository";
import { v4 as uuidv4 } from "uuid";
import { verfiyWeddingOwnershipService } from "./wedding.service";
import { ApiError } from "../utils/apiError.util";

export const getAllGuestsService = async (
  weddingId: string,
  eventId?: string,
  page: number = 1,
  limit: number = 10,
) => {
  const guests = await findAllGuests(weddingId, eventId, page, limit);

  return guests;
};

export const addNewGuestService = async (
  payload: Prisma.GuestUncheckedCreateInput,
  eventId: string,
) => {
  return prisma.$transaction(async (tx) => {
    const existingGuest = await findGuestByMobileNumberAndWeddingId(
      payload.mobile_number,
      payload.wedding_id,
      tx,
    );

    let guest: Guest;

    if (!existingGuest) {
      guest = await createGuest(payload, tx);
      if (!guest) throw new ApiError(400, "Failed to create guest");
    } else guest = existingGuest;

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

    if (!guestEventInvite) throw new ApiError(400, "Failed to create guest");

    return guest;
  });
};

export const getWeddingGuestService = async (
  userId: string,
  guestId: string,
) => {
  const guest = await getWeddingGuest(guestId);

  if (!guest) throw new ApiError(403, "Guest not found");

  const isWeddingOwner = await verfiyWeddingOwnershipService(
    userId,
    guest.wedding_id,
  );

  if (!isWeddingOwner) throw new ApiError(403, "Guest not found");

  return guest;
};

export const deleteWeddingGuestService = async (guestId: string) => {
  const guest = await deleteGuest(guestId);

  if (!guest) throw new ApiError(403, "Failed to delete guest");
};
