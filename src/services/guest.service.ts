import { Guest, Prisma } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import {
  createGuest,
  createGuestEventInvite,
  deleteGuest,
  deleteGuestEventInvitesByEventIds,
  findAllGuests,
  findGuestByMobileNumberAndWeddingId,
  findGuestEventInvitesByGuestId,
  getGuestsConfirmationStats,
  getWeddingGuest,
  updateGuest,
} from "../repositories/guest.repository";
import { v4 as uuidv4 } from "uuid";
import { verfiyWeddingOwnershipService } from "./wedding.service";
import { ApiError } from "../utils/apiError.util";
import {
  EditWeddingGuestDto,
  AddNewGuestDto,
} from "../validations/guest.validations";
import { verifyWeddingEventOwnershipService } from "./event.service";
import { findGuestEventInviteFormatByEventId } from "../repositories/eventInviteFormat.repository";

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
  userId: string,
  body: AddNewGuestDto,
) => {
  // Verify ownership of all provided events
  const events = await Promise.all(
    body.eventIds.map(async (eventId) => {
      const event = await verifyWeddingEventOwnershipService(eventId, userId);

      if (!event) throw new ApiError(400, "Invalid Event or Event Not Found");

      return event;
    }),
  );

  // A user can own multiple weddings — ensure all events come from the same one
  // (verify Wedding Event Ownership Service only checks user → wedding ownership,
  //  not that every event shares the same wedding_id)
  const weddingIds = new Set(events.map((e) => e.wedding_id));
  if (weddingIds.size > 1)
    throw new ApiError(400, "All events must belong to the same wedding");

  const wedding_id = events[0].wedding_id;
  const eventIds = events.map((e) => e.id);

  const guestPayload: Prisma.GuestUncheckedCreateInput = {
    wedding_id,
    name: body.name,
    mobile_number: body.mobile_number,
    email: body.email,
    side: body.side,
  };

  return prisma.$transaction(async (tx) => {
    // 3. Reuse existing guest if mobile + wedding already on record
    const existingGuest = await findGuestByMobileNumberAndWeddingId(
      guestPayload.mobile_number,
      guestPayload.wedding_id,
      tx,
    );

    let guest: Guest;

    if (!existingGuest) {
      guest = await createGuest(guestPayload, tx);
      if (!guest) throw new ApiError(400, "Failed to create guest");
    } else guest = existingGuest;

    // 4. Create an event invite for each provided event
    const guestEventInvites = await Promise.all(
      eventIds.map(async (eventId) => {
        const guestEventInviteFormat =
          await findGuestEventInviteFormatByEventId(eventId, tx);

        if (!guestEventInviteFormat)
          throw new Error("Event invite format not found");

        const guestInvitePayload: Prisma.GuestEventInviteUncheckedCreateInput =
          {
            event_id: eventId,
            guest_id: guest.id,
            invite_format_id: guestEventInviteFormat.id,
            invite_token: uuidv4(),
            plus_ones: null,
            dietary: null,
            invite_deadline: null,
            responded_at: null,
          };
        return await createGuestEventInvite(guestInvitePayload, tx);
      }),
    );

    if (guestEventInvites.some((invite) => !invite))
      throw new ApiError(400, "Failed to create guest");

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

export const editWeddingGuestService = async (
  guestId: string,
  userId: string,
  payload: EditWeddingGuestDto["body"],
) => {
  // Verify the guest belongs to a wedding owned by the current user
  const guest = await getWeddingGuestService(userId, guestId);

  const newEventIds = payload.eventIds ?? [];

  return prisma.$transaction(async (tx) => {
    // Fetch the current event invites for this guest
    const existingInvites = await findGuestEventInvitesByGuestId(guestId, tx);
    const existingEventIds = new Set(existingInvites.map((i) => i.event_id));

    const newEventIdSet = new Set(newEventIds);

    // Determine which event IDs to add and which to remove
    const toAdd = newEventIds.filter((id) => !existingEventIds.has(id));
    const toRemove = [...existingEventIds].filter(
      (id) => !newEventIdSet.has(id),
    );

    // Verify ownership of every newly-added event before any writes
    if (toAdd.length > 0) {
      const verifiedEvents = await Promise.all(
        toAdd.map(async (eventId) => {
          const ownershipEvent = await verifyWeddingEventOwnershipService(
            eventId,
            userId,
          );

          if (!ownershipEvent)
            throw new ApiError(400, "Invalid Event or Event Not Found");

          return ownershipEvent;
        }),
      );

      // A user can own multiple weddings — ensure all new events belong
      // to the same wedding the guest is already part of
      const hasEventFromAnotherWedding = verifiedEvents.some(
        (event) => event.wedding_id !== guest.wedding_id,
      );
      if (hasEventFromAnotherWedding)
        throw new ApiError(
          400,
          "All events must belong to the guest's wedding",
        );
    }

    // 4. Delete removed invites
    if (toRemove.length > 0)
      await deleteGuestEventInvitesByEventIds(guestId, toRemove, tx);

    // 5. Create new invites
    if (toAdd.length > 0)
      await Promise.all(
        toAdd.map(async (eventId) => {
          const guestEventInviteFormat =
            await findGuestEventInviteFormatByEventId(eventId, tx);

          if (!guestEventInviteFormat)
            throw new Error("Event invite format not found");

          return await createGuestEventInvite(
            {
              event_id: eventId,
              guest_id: guestId,
              invite_format_id: guestEventInviteFormat.id,
              invite_token: uuidv4(),
              plus_ones: null,
              dietary: null,
              invite_deadline: null,
              responded_at: null,
            },
            tx,
          );
        }),
      );
    // 5. Update guest profile fields if any were provided
    const { eventIds: _eventIds, ...guestFields } = payload;
    const hasGuestUpdates = Object.keys(guestFields).length > 0;

    const updatedGuest = hasGuestUpdates
      ? await updateGuest(guestId, guestFields, tx)
      : await getWeddingGuest(guestId, tx);

    if (!updatedGuest) throw new ApiError(400, "Failed to update guest");

    return updatedGuest;
  });
};

export const deleteWeddingGuestService = async (guestId: string) => {
  const guest = await deleteGuest(guestId);

  if (!guest) throw new ApiError(403, "Failed to delete guest");
};

export const calculateConfirmationOfGuest = async (weddingId: string) => {
  const [totalInvites, confirmedInvites] =
    await getGuestsConfirmationStats(weddingId);

  const confirmationRate =
    totalInvites === 0
      ? 0
      : Number(((confirmedInvites / totalInvites) * 100).toFixed(2));

  return confirmationRate;
};
