import { Prisma } from "../../generated/prisma/client";
import { emitRsvp, toLiveRsvp } from "../lib/rsvpEvents";
import {
  findRsvpInvite,
  updateRsvpInvite,
} from "../repositories/rsvp.repository";
import { ApiError } from "../utils/apiError.util";
import { buildRsvpUpdate } from "../utils/rsvp.util";
import { SubmitRsvpBody } from "../validations/rsvp.validation";

type RsvpInvite = NonNullable<Awaited<ReturnType<typeof findRsvpInvite>>>;

const INVALID_LINK = "This invitation link isn't valid";

const requireInvite = async (
  where: Prisma.GuestEventInviteWhereInput,
  notFoundMessage: string,
) => {
  const invite = await findRsvpInvite(where);

  if (!invite) throw new ApiError(404, notFoundMessage);

  return invite;
};

const toRsvpView = (invite: RsvpInvite) => {
  const { guest, event, invite_format, ...reply } = invite;
  // wedding_id stays internal; the RSVP page never needs it
  const { wedding, wedding_id: _weddingId, ...eventDetails } = event;

  return {
    guest,
    wedding,
    event: { ...eventDetails, format: invite_format, invite: reply },
  };
};

const saveReply = async (
  invite: RsvpInvite,
  body: SubmitRsvpBody,
  ignoreDeadline: boolean,
) => {
  const saved = await updateRsvpInvite(
    invite.id,
    buildRsvpUpdate(
      ignoreDeadline ? { invite_deadline: null } : invite,
      invite.invite_format,
      body,
      new Date(),
    ),
  );

  // Announce only after the reply is saved
  emitRsvp(
    invite.event.wedding_id,
    toLiveRsvp({ ...saved, guest: invite.guest, event: invite.event }),
  );

  return saved;
};

export const getRsvpService = async (token: string) =>
  toRsvpView(await requireInvite({ invite_token: token }, INVALID_LINK));

export const submitRsvpService = async (token: string, body: SubmitRsvpBody) =>
  saveReply(await requireInvite({ invite_token: token }, INVALID_LINK), body, false);

// Host portal: set a reply for a guest who couldn't use their link.
// The RSVP deadline only limits guests; hosts can still record late replies.
export const submitGuestRsvpService = async (
  userId: string,
  inviteId: string,
  body: SubmitRsvpBody,
) =>
  saveReply(
    await requireInvite(
      { id: inviteId, event: { wedding: { user_id: userId } } },
      "Invite not found",
    ),
    body,
    true,
  );
