import { GoogleGenAI, Modality } from "@google/genai";
import { Prisma } from "../../generated/prisma/client";
import {
  findGuestEventInviteFormatByEventId,
  findGuestEventInviteFormatById,
  updateGuestEventInviteFormat,
} from "../repositories/eventInviteFormat.repository";
import { ApiError } from "../utils/apiError.util";
import { getBufferFromS3, uploadBufferToS3 } from "./aws.service";
import { verifyWeddingEventOwnershipService } from "./event.service";
import { editImageWithGemini } from "../utils/geminiImageEditor.util";
import logger from "../config/logger";

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
  illustrationStyle: string,
  negativePrompt: string,
) => {
  const { buffer: rawImageBuffer, contentType } =
    await getBufferFromS3(rawImageKey);

  const generatedImageBuffer = await editImageWithGemini({
    imageBuffer: rawImageBuffer,
    contentType,
    prompt: illustrationStyle || "make this image look like oil painting style",
    negativePrompt,
    aspectRatio: "1:1",
  });

  const generatedImageKey = await uploadBufferToS3(
    generatedImageBuffer,
    "generated-images",
    "image/png",
  );

  await updateEventInviteFormatService(eventId, userId, {
    generated_image: generatedImageKey,
  });

  logger.info(
    { eventId, userId, generatedImageKey },
    "Event invite format image generated",
  );

  return generatedImageKey;
};
