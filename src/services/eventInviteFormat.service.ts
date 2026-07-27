import { GoogleGenAI, Modality } from "@google/genai";
import { Prisma } from "../../generated/prisma/client";
import {
  findGuestEventInviteFormatByEventId,
  findGuestEventInviteFormatById,
  getGuestEventInviteFormatsByWedding,
  updateGuestEventInviteFormat,
} from "../repositories/eventInviteFormat.repository";
import { getEventGuestStats } from "../repositories/guest.repository";
import { ApiError } from "../utils/apiError.util";
import { getBufferFromS3, uploadBufferToS3 } from "./aws.service";
import { verifyWeddingEventOwnershipService } from "./event.service";
import { editImageWithGemini } from "../utils/geminiImageEditor.util";
import { BuildPromptParams } from "../types/eventInviteFormat.type";
import logger from "../config/logger";

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

  const updatedEventInviteFormat = await updateGuestEventInviteFormat(
    eventInviteFormat.id,
    payload,
  );

  if (!updatedEventInviteFormat)
    throw new ApiError(400, "Failed to update event invite format");

  return updatedEventInviteFormat;
};

export const getEventinviteFormatService = async (id: string) => {
  const eventInviteFormat = await findGuestEventInviteFormatById(id);

  if (!eventInviteFormat)
    throw new ApiError(404, "Event Invite Format Not Found");

  return eventInviteFormat;
};

export const generateEventInviteFormatImageService = async (
  eventId: string,
  userId: string,
  rawImageKey: string,
  promptParams: BuildPromptParams,
) => {
  const { buffer: rawImageBuffer, contentType } =
    await getBufferFromS3(rawImageKey);

  const generatedImageBuffer = await editImageWithGemini({
    contentType,
    imageBuffer: rawImageBuffer,
    aspectRatio: "1:1",
    promptParams,
  });

  const generatedImageKey = await uploadBufferToS3(
    generatedImageBuffer,
    "generated-images",
    "image/png",
  );

  logger.info(
    { eventId, userId, generatedImageKey },
    "Event invite format image generated",
  );

  return generatedImageKey;
};
