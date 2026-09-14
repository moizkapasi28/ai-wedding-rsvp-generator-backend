import type { Prisma } from "../../generated/prisma/client";
import { ApiError } from "./apiError.util";
import type { SubmitRsvpBody } from "../validations/rsvp.validation";

export type RsvpFormat = {
  dietary_preference: boolean;
  plus_ones: boolean;
  song_request: boolean;
  message: boolean;
};

// Kept free of DB/logger imports so it can be unit tested in isolation
export const buildRsvpUpdate = (
  invite: { invite_deadline: Date | null },
  format: RsvpFormat,
  body: SubmitRsvpBody,
  now: Date,
): Prisma.GuestEventInviteUpdateInput => {
  if (invite.invite_deadline && invite.invite_deadline < now) {
    throw new ApiError(409, "RSVPs for this event are closed");
  }

  return {
    status: body.status,
    responded_at: now,
    // Fields the host turned off in Page Settings are ignored
    ...(format.plus_ones && body.plus_ones !== undefined
      ? { plus_ones: body.plus_ones }
      : {}),
    ...(format.dietary_preference && body.dietary !== undefined
      ? { dietary: body.dietary }
      : {}),
    ...(format.song_request && body.song_request !== undefined
      ? { song_request: body.song_request }
      : {}),
    ...(format.message && body.message !== undefined
      ? { message: body.message }
      : {}),
  };
};
