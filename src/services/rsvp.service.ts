import { emitRsvp, toLiveRsvp } from "../lib/rsvpEvents";
import {
  findInviteByToken,
  updateRsvpInvite,
} from "../repositories/rsvp.repository";
import { ApiError } from "../utils/apiError.util";
import { buildRsvpUpdate } from "../utils/rsvp.util";
import { SubmitRsvpBody } from "../validations/rsvp.validation";

export const getRsvpService = async (token: string) => {
  const invite = await findInviteByToken(token);

  if (!invite) throw new ApiError(404, "This invitation link isn't valid");

  const { guest, event, invite_format, ...reply } = invite;
  // wedding_id stays internal; the public page never needs it
  const { wedding, wedding_id: _weddingId, ...eventDetails } = event;

  return {
    guest,
    wedding,
    event: { ...eventDetails, format: invite_format, invite: reply },
  };
};

export const submitRsvpService = async (token: string, body: SubmitRsvpBody) => {
  const invite = await findInviteByToken(token);

  if (!invite) throw new ApiError(404, "This invitation link isn't valid");

  const saved = await updateRsvpInvite(
    invite.id,
    buildRsvpUpdate(invite, invite.invite_format, body, new Date()),
  );

  // Announce only after the reply is saved
  emitRsvp(
    invite.event.wedding_id,
    toLiveRsvp({ ...saved, guest: invite.guest, event: invite.event }),
  );

  return saved;
};
