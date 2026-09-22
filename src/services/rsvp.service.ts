import { Prisma } from "../../generated/prisma/client";
import logger from "../config/logger";
import { emitRsvp, toLiveRsvp } from "../lib/rsvpEvents";
import { findAiEventInviteCardByEventId } from "../repositories/inviteCard.repository";
import {
  findRsvpInvite,
  updateRsvpInvite,
} from "../repositories/rsvp.repository";
import { ApiError } from "../utils/apiError.util";
import { buildRsvpUpdate } from "../utils/rsvp.util";
import { SubmitRsvpBody } from "../validations/rsvp.validation";
import { generatePresignedUrl } from "./aws.service";

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

// Guests aren't signed in and can't ask for a view URL themselves, so images on
// their page go out already signed, never as raw S3 keys.
const signForGuest = async (key: string | null | undefined, eventId: string) => {
  if (!key) return null;

  try {
    return await generatePresignedUrl(
      process.env.AWS_BUCKET_NAME,
      key,
      // The same expiry the host-side view URLs use
      Number(process.env.AWS_BUCKET_PUT_URL_EXPIRE),
      "getObject",
    );
  } catch (error) {
    // A missing picture shouldn't cost the guest their RSVP page
    logger.error({ error, eventId, key }, "Failed to sign image for RSVP page");
    return null;
  }
};

export const getRsvpService = async (token: string) => {
  const invite = await requireInvite({ invite_token: token }, INVALID_LINK);
  const view = toRsvpView(invite);
  const eventId = invite.event.id;
  const { generated_image: illustrationKey, ...format } = view.event.format ?? {};

  // The invitation card (generated or uploaded) is looked up here rather than in
  // findRsvpInvite, whose result also feeds reply saving and the live stream.
  const card = await findAiEventInviteCardByEventId(eventId);
  const [invite_card_url, illustration_url] = await Promise.all([
    signForGuest(card?.generated_invite_image_url, eventId),
    signForGuest(illustrationKey, eventId),
  ]);

  return {
    ...view,
    event: {
      ...view.event,
      format: { ...format, illustration_url },
      invite_card_url,
    },
  };
};

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
