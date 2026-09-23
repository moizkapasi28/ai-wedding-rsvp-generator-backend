import { Prisma } from "../../generated/prisma/client";
import logger from "../config/logger";
import {
  findGuestEventInviteFormatByEventId,
  findGuestEventInviteFormatById,
  getGuestEventInviteFormatsByWedding,
  setInviteDeadlineForFormat,
  updateGuestEventInviteFormat,
} from "../repositories/eventInviteFormat.repository";
import { prisma } from "../lib/prisma";
import { getEventGuestStats } from "../repositories/guest.repository";
import { BuildPromptParams } from "../types/eventInviteFormat.type";
import { ApiError } from "../utils/apiError.util";
import {
  assertOwnedImageKeys,
  PAGE_SETTING_IMAGE_KEY_FIELDS,
  userPrefix,
} from "../utils/imageKeyOwnership.util";
import { pageSettingEditImageWithGemini } from "../utils/geminiImageEditor.util";
import { AI_CREDIT_COST, refundCredits, spendCredits } from "./credits.service";
import { getBufferFromS3, uploadBufferToS3 } from "./aws.service";
import { verifyWeddingEventOwnershipService } from "./event.service";

export const getEventInviteFormatsByWeddingService = async (
  weddingId: string,
  page: number = 1,
) => {
  const limit = 5;
  const inviteFormatsData = await getGuestEventInviteFormatsByWedding(
    weddingId,
    page,
    limit,
  );

  if (!inviteFormatsData)
    throw new ApiError(404, "Event Invite Format Not Found");

  const eventIds = inviteFormatsData.events.map((event) => event.id);
  const eventStats = await getEventGuestStats(eventIds);

  const eventsWithStats = inviteFormatsData.events.map((event) => ({
    ...event,
    stats: eventStats[event.id],
  }));

  return { ...inviteFormatsData, events: eventsWithStats };
};

export const getEventInviteFormatByEventService = async (
  eventId: string,
  userId: string,
) => {
  const ownershipEvent = await verifyWeddingEventOwnershipService(
    eventId,
    userId,
  );

  if (!ownershipEvent)
    throw new ApiError(400, "Invalid Invite Format or Invite Format Not Found");

  const guestEventInviteFormat =
    await findGuestEventInviteFormatByEventId(eventId);

  if (!guestEventInviteFormat)
    throw new ApiError(404, "Event Invite Format Not Found");

  return guestEventInviteFormat;
};

export const updateEventInviteFormatService = async (
  id: string,
  userId: string,
  payload: Prisma.GuestEventInviteFormatUpdateInput,
) => {
  const eventInviteFormat = await findGuestEventInviteFormatById(id);

  if (!eventInviteFormat)
    throw new ApiError(404, "Event Invite Format Not Found");

  const ownershipEvent = await verifyWeddingEventOwnershipService(
    eventInviteFormat.event_id,
    userId,
  );

  if (!ownershipEvent)
    throw new ApiError(400, "Invalid Invite Format or Invite Format Not Found");

  assertOwnedImageKeys(
    userId,
    PAGE_SETTING_IMAGE_KEY_FIELDS,
    eventInviteFormat,
    payload,
  );

  const updatedEventInviteFormat = await prisma.$transaction(async (tx) => {
    const format = await updateGuestEventInviteFormat(
      eventInviteFormat.id,
      payload,
      tx,
    );

    // Keep every invite's deadline in step with the event's setting
    if (payload.rsvp_deadline !== undefined)
      await setInviteDeadlineForFormat(format.id, format.rsvp_deadline, tx);

    return format;
  });

  if (!updatedEventInviteFormat)
    throw new ApiError(400, "Failed to update event invite format");

  return updatedEventInviteFormat;
};

export const getEventinviteFormatService = async (id: string, userId: string) => {
  const eventInviteFormat = await findGuestEventInviteFormatById(id);

  // Missing and not-yours look the same, so another wedding's ids aren't confirmed
  const isOwner =
    !!eventInviteFormat &&
    !!(await verifyWeddingEventOwnershipService(eventInviteFormat.event_id, userId));

  if (!isOwner) throw new ApiError(404, "Event Invite Format Not Found");

  return eventInviteFormat;
};

export const generateEventInviteFormatImageService = async (
  eventId: string,
  userId: string,
  rawImageKey: string,
  promptParams: BuildPromptParams,
) => {
  const ownershipEvent = await verifyWeddingEventOwnershipService(
    eventId,
    userId,
  );

  if (!ownershipEvent)
    throw new ApiError(400, "Invalid Invite Format or Invite Format Not Found");

  // The server reads this key itself, so without the check a caller could have
  // someone else's photo pulled from S3 and run through the model for them.
  // The one already saved on this event's settings stays usable even if it
  // predates per-user prefixes.
  const format = await findGuestEventInviteFormatByEventId(eventId);
  assertOwnedImageKeys(
    userId,
    ["raw_image"],
    { raw_image: format?.raw_image ?? null },
    { raw_image: rawImageKey },
  );

  const { buffer: rawImageBuffer, contentType } =
    await getBufferFromS3(rawImageKey);

  await spendCredits(userId, AI_CREDIT_COST.HEADER_IMAGE);

  let generatedImageKey: string;
  try {
    const generatedImageBuffer = await pageSettingEditImageWithGemini({
      contentType,
      imageBuffer: rawImageBuffer,
      aspectRatio: "1:1",
      promptParams,
    });

    generatedImageKey = await uploadBufferToS3(
      generatedImageBuffer,
      // Under the user's own prefix: the client saves this key back onto the
      // page settings, and that save only accepts keys the user owns.
      `${userPrefix(userId)}generated-images/rsvp-generated-images`,
      "image/png",
    );
  } catch (error) {
    await refundCredits(userId, AI_CREDIT_COST.HEADER_IMAGE);
    throw error;
  }

  logger.info(
    { eventId, userId, generatedImageKey },
    "Event invite format image generated",
  );

  return generatedImageKey;
};
