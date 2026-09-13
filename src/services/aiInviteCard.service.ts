import { AIEventInviteCard, Prisma } from "../../generated/prisma/client";
import logger from "../config/logger";
import {
  GENERATION_MODE,
  GENERATION_STAGE,
  GENERATION_STALE_AFTER_MS,
  GENERATION_STATUS,
} from "../enums/aiEventInvite.enum";
import {
  addGenerateInviteCardJob,
  GenerateInviteCardJobPayload,
} from "../queues/aiInviteCard.queue";
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

const isGenerationStale = (aiInviteCard: AIEventInviteCard) => {
  const startedAt = aiInviteCard.generation_started_at;

  if (!startedAt) return true;

  return Date.now() - startedAt.getTime() > GENERATION_STALE_AFTER_MS;
};

const isGenerationInFlight = (aiInviteCard: AIEventInviteCard) => {
  const isRunning =
    aiInviteCard.generation_status === GENERATION_STATUS.QUEUED ||
    aiInviteCard.generation_status === GENERATION_STATUS.PROCESSING;

  return isRunning && !isGenerationStale(aiInviteCard);
};

export const getAiInviteCardsByWeddingService = async (
  weddingId: string,
  page: number = 1,
  limit: number = 5,
) => {
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
  const { eventId: _eventId, ...config } = body;

  const aiInviteCard = await findAiEventInviteCardByEventId(eventId);

  if (!aiInviteCard) throw new ApiError(404, "Event Invite card Not Found");

  const ownershipEvent = await verifyWeddingEventOwnershipService(
    aiInviteCard.event_id,
    userId,
  );

  if (!ownershipEvent)
    throw new ApiError(400, "Invalid Invite card or Invite card Not Found");

  if (isGenerationInFlight(aiInviteCard))
    throw new ApiError(
      409,
      "An invitation is already being generated for this event.",
    );

  // Persist the submitted configuration so the design survives a reload, and so
  // the worker generates from the stored record rather than the request body.
  const savedAiInviteCard = await updateAiEventInviteCard(aiInviteCard.id, {
    ...config,
    generation_status: GENERATION_STATUS.QUEUED,
    generation_stage: null,
    generation_error: null,
    generation_started_at: new Date(),
    generation_completed_at: null,
  });

  const job = await addGenerateInviteCardJob(
    savedAiInviteCard.id,
    savedAiInviteCard.event_id,
    userId,
  );

  await updateAiEventInviteCard(savedAiInviteCard.id, {
    generation_job_id: job.id ?? null,
  });

  return {
    aiInviteCardId: savedAiInviteCard.id,
    jobId: job.id ?? null,
    status: GENERATION_STATUS.QUEUED,
  };
};

// Runs inside the worker process — the HTTP request is long gone by this point,
// so every outcome has to be recorded on the card for the page to read back.
export const runAiInviteCardGenerationJob = async (
  { aiInviteCardId, userId }: GenerateInviteCardJobPayload,
  onStage?: (stage: GENERATION_STAGE) => Promise<void> | void,
) => {
  const aiInviteCard = await findAiEventInviteCardById(aiInviteCardId);

  if (!aiInviteCard) throw new ApiError(404, "AI Invite Card Not Found");

  const ownershipEvent = await verifyWeddingEventOwnershipService(
    aiInviteCard.event_id,
    userId,
  );

  if (!ownershipEvent)
    throw new ApiError(400, "Invalid Invite card or Invite card Not Found");

  const reportStage = async (stage: GENERATION_STAGE) => {
    await updateAiEventInviteCard(aiInviteCardId, { generation_stage: stage });
    await onStage?.(stage);
  };

  await updateAiEventInviteCard(aiInviteCardId, {
    generation_status: GENERATION_STATUS.PROCESSING,
    generation_stage: GENERATION_STAGE.DESIGN,
    generation_error: null,
  });

  try {
    const generatedImageKey =
      aiInviteCard.generation_mode === GENERATION_MODE.EXAMPLE
        ? await aiInviteCardExampleGenerationService(
            aiInviteCard,
            ownershipEvent,
            reportStage,
          )
        : await aiInviteCardManualGenerationService(
            aiInviteCard,
            ownershipEvent,
            reportStage,
          );

    if (!generatedImageKey)
      throw new ApiError(502, "The image generator returned no invitation.");

    await updateAiEventInviteCard(aiInviteCardId, {
      generation_status: GENERATION_STATUS.COMPLETED,
      generation_stage: null,
      generation_error: null,
      generation_completed_at: new Date(),
    });

    return { generatedImageKey };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate the invitation.";

    logger.error({ err: error, aiInviteCardId }, "AI invite card job failed");

    await updateAiEventInviteCard(aiInviteCardId, {
      generation_status: GENERATION_STATUS.FAILED,
      generation_stage: null,
      generation_error: message,
      generation_completed_at: new Date(),
    });

    throw error;
  }
};

export const getAiInviteCardGenerationStatusService = async (
  id: string,
  userId: string,
) => {
  let aiInviteCard = await findAiEventInviteCardById(id);

  if (!aiInviteCard) throw new ApiError(404, "AI Invite Card Not Found");

  const ownershipEvent = await verifyWeddingEventOwnershipService(
    aiInviteCard.event_id,
    userId,
  );

  if (!ownershipEvent)
    throw new ApiError(400, "Invalid Invite card or Invite card Not Found");

  // A worker that died mid-run can never write its own failure, so the page would
  // poll a PROCESSING card forever. Retire it here instead.
  if (
    (aiInviteCard.generation_status === GENERATION_STATUS.QUEUED ||
      aiInviteCard.generation_status === GENERATION_STATUS.PROCESSING) &&
    isGenerationStale(aiInviteCard)
  ) {
    aiInviteCard = await updateAiEventInviteCard(aiInviteCard.id, {
      generation_status: GENERATION_STATUS.FAILED,
      generation_stage: null,
      generation_error: "Generation timed out. Please try again.",
      generation_completed_at: new Date(),
    });
  }

  return {
    id: aiInviteCard.id,
    event_id: aiInviteCard.event_id,
    status: aiInviteCard.generation_status,
    stage: aiInviteCard.generation_stage,
    error: aiInviteCard.generation_error,
    job_id: aiInviteCard.generation_job_id,
    generated_invite_image_url: aiInviteCard.generated_invite_image_url,
    started_at: aiInviteCard.generation_started_at,
    completed_at: aiInviteCard.generation_completed_at,
  };
};
