import { Prisma } from "../../generated/prisma/client";
import { GENERATION_MODE } from "../enums/aiEventInvite.enum";
import {
  findAiEventInviteCardByEventId,
  findAiEventInviteCardById,
  getAiInviteCardsByWedding,
  updateAiEventInviteCard,
} from "../repositories/aiInviteCard.repository";
import { ApiError } from "../utils/apiError.util";
import { GenerateAIInviteCardImageDto } from "../validations/aiInviteCard.validation";
import {
  aiInviteCardExampleGenerationService,
  aiInviteCardManualGenerationService,
} from "./aiInviteCardGeneration.service";
import { verifyWeddingEventOwnershipService } from "./event.service";

export const getAiInviteCardsByWeddingService = async (
  weddingId: string,
  page: number = 1,
) => {
  const limit = 5;
  const inviteCards = await getAiInviteCardsByWedding(weddingId, page, limit);

  if (!inviteCards) throw new ApiError(404, "AI Invite Cards Not Found");

  return inviteCards;
};

export const updateAiInviteCardService = async (
  id: string,
  userId: string,
  payload: Prisma.AIEventInviteCardUpdateInput,
) => {
  const aiInviteCard = await findAiEventInviteCardById(id);

  if (!aiInviteCard) throw new ApiError(404, "AI Invite Card Not Found");

  const ownershipEvent = await verifyWeddingEventOwnershipService(
    aiInviteCard.event_id,
    userId,
  );

  if (!ownershipEvent)
    throw new ApiError(
      400,
      "Invalid AI Invite Card or AI Invite Card Not Found",
    );

  const updatedAiInviteCard = await updateAiEventInviteCard(id, payload);

  if (!updatedAiInviteCard)
    throw new ApiError(400, "Failed to update invite card");

  return updatedAiInviteCard;
};

export const generateAIInviteCardService = async (
  eventId: string,
  userId: string,
  body: GenerateAIInviteCardImageDto,
) => {
  const { generation_mode, ...prompt } = body;

  const aiInviteCard = await findAiEventInviteCardByEventId(eventId);

  if (!aiInviteCard) throw new ApiError(404, "Event Invite card Not Found");

  const ownershipEvent = await verifyWeddingEventOwnershipService(
    aiInviteCard.event_id,
    userId,
  );

  if (!ownershipEvent)
    throw new ApiError(400, "Invalid Invite card or Invite card Not Found");

  if (generation_mode === GENERATION_MODE.EXAMPLE) {
    await aiInviteCardExampleGenerationService({ ...aiInviteCard, ...body }, ownershipEvent);
  } else if (generation_mode === GENERATION_MODE.MANUAL) {
    await aiInviteCardManualGenerationService({ ...aiInviteCard, ...body }, ownershipEvent);
  }
};
