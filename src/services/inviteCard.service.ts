import { UnrecoverableError } from "bullmq";
import { EventInviteCard, Prisma } from "../../generated/prisma/client";
import logger from "../config/logger";
import {
  GENERATION_ERROR_CODE,
  GENERATION_STALE_AFTER_MS,
  GENERATION_STATUS,
  MAX_GENERATION_ATTEMPTS,
} from "../enums/inviteCard.enum";
import {
  addGenerateInviteCardJob,
  GenerateInviteCardJobPayload,
} from "../queues/inviteCard.queue";
import {
  findAiEventInviteCardByEventId,
  findAiEventInviteCardById,
  getInviteCardsByWedding,
  updateAiEventInviteCard,
} from "../repositories/inviteCard.repository";
import { ApiError } from "../utils/apiError.util";
import {
  AI_CARD_IMAGE_KEY_FIELDS,
  assertOwnedImageKeys,
} from "../utils/imageKeyOwnership.util";
import { GenerateInviteCardImageDto } from "../validations/inviteCard.validation";
import {
  classifyGeminiError,
  GeminiGenerationError,
} from "../utils/geminiImage.util";
import {
  defaultPipelineDeps,
  PipelineDeps,
  runInviteCardPipeline,
} from "./inviteCardGeneration.service";
import { verifyWeddingEventOwnershipService } from "./event.service";

const isGenerationStale = (inviteCard: EventInviteCard) => {
  // Heartbeats keep a slow but healthy retry chain alive; older rows only have started_at
  const lastSeen =
    inviteCard.generation_heartbeat_at ?? inviteCard.generation_started_at;

  if (!lastSeen) return true;

  return Date.now() - lastSeen.getTime() > GENERATION_STALE_AFTER_MS;
};

const isGenerationInFlight = (inviteCard: EventInviteCard) => {
  const isRunning =
    inviteCard.generation_status === GENERATION_STATUS.QUEUED ||
    inviteCard.generation_status === GENERATION_STATUS.PROCESSING;

  return isRunning && !isGenerationStale(inviteCard);
};

export const getInviteCardsByWeddingService = async (
  weddingId: string,
  page: number = 1,
  limit: number = 5,
) => {
  const inviteCards = await getInviteCardsByWedding(weddingId, page, limit);

  if (!inviteCards) throw new ApiError(404, "AI Invite Cards Not Found");

  return inviteCards;
};

export const updateInviteCardService = async (
  id: string,
  userId: string,
  payload: Prisma.EventInviteCardUpdateInput,
) => {
  const inviteCard = await findAiEventInviteCardById(id);

  if (!inviteCard) throw new ApiError(404, "AI Invite Card Not Found");

  const ownershipEvent = await verifyWeddingEventOwnershipService(
    inviteCard.event_id,
    userId,
  );

  if (!ownershipEvent)
    throw new ApiError(
      400,
      "Invalid AI Invite Card or AI Invite Card Not Found",
    );

  assertOwnedImageKeys(userId, AI_CARD_IMAGE_KEY_FIELDS, inviteCard, payload);

  const updatedInviteCard = await updateAiEventInviteCard(id, payload);

  if (!updatedInviteCard)
    throw new ApiError(400, "Failed to update invite card");

  return updatedInviteCard;
};

export const generateInviteCardService = async (
  eventId: string,
  userId: string,
  body: GenerateInviteCardImageDto,
) => {
  const { eventId: _eventId, ...config } = body;

  const inviteCard = await findAiEventInviteCardByEventId(eventId);

  if (!inviteCard) throw new ApiError(404, "Event Invite card Not Found");

  const ownershipEvent = await verifyWeddingEventOwnershipService(
    inviteCard.event_id,
    userId,
  );

  if (!ownershipEvent)
    throw new ApiError(400, "Invalid Invite card or Invite card Not Found");

  assertOwnedImageKeys(userId, AI_CARD_IMAGE_KEY_FIELDS, inviteCard, config);

  if (isGenerationInFlight(inviteCard))
    throw new ApiError(
      409,
      "An invitation is already being generated for this event.",
    );

  // Persist the submitted configuration so the design survives a reload, and so
  // the worker generates from the stored record rather than the request body.
  const savedInviteCard = await updateAiEventInviteCard(inviteCard.id, {
    ...config,
    generation_status: GENERATION_STATUS.QUEUED,
    generation_stage: null,
    generation_error: null,
    generation_error_code: null,
    generation_attempt: 1,
    generation_started_at: new Date(),
    generation_heartbeat_at: new Date(),
    generation_completed_at: null,
  });

  const job = await addGenerateInviteCardJob(
    savedInviteCard.id,
    savedInviteCard.event_id,
    userId,
  );

  await updateAiEventInviteCard(savedInviteCard.id, {
    generation_job_id: job.id ?? null,
  });

  return {
    inviteCardId: savedInviteCard.id,
    jobId: job.id ?? null,
    status: GENERATION_STATUS.QUEUED,
  };
};

// Runs inside the worker process — the HTTP request is long gone by this point,
// so every outcome has to be recorded on the card for the page to read back.
export const runInviteCardGenerationJob = async (
  { inviteCardId, userId }: GenerateInviteCardJobPayload,
  {
    attempt,
    maxAttempts,
    jobId,
  }: { attempt: number; maxAttempts: number; jobId?: string },
  deps: PipelineDeps = defaultPipelineDeps(),
) => {
  const log = logger.child({ cardId: inviteCardId, jobId, attempt });
  const startedAt = Date.now();

  const inviteCard = await findAiEventInviteCardById(inviteCardId);

  // Nowhere to record the failure, and a retry cannot bring the card back
  if (!inviteCard) throw new UnrecoverableError("AI Invite Card Not Found");

  const heartbeat = (data: Prisma.EventInviteCardUpdateInput = {}) =>
    updateAiEventInviteCard(inviteCardId, {
      ...data,
      generation_heartbeat_at: new Date(),
    });

  try {
    const ownershipEvent = await verifyWeddingEventOwnershipService(
      inviteCard.event_id,
      userId,
    );

    if (!ownershipEvent)
      throw new GeminiGenerationError(
        GENERATION_ERROR_CODE.INVALID_INPUT,
        "Event not found for the job's user",
      );

    await heartbeat({
      generation_status: GENERATION_STATUS.PROCESSING,
      generation_stage: null,
      generation_attempt: attempt,
    });

    const result = await runInviteCardPipeline(
      inviteCard,
      ownershipEvent,
      deps,
      {
        log,
        onStage: (stage) => heartbeat({ generation_stage: stage }),
        onRetry: () => heartbeat(),
      },
    );

    await heartbeat({
      generation_status: GENERATION_STATUS.COMPLETED,
      generation_stage: null,
      generation_error: null,
      generation_error_code: null,
      generation_completed_at: new Date(),
    });

    log.info(
      {
        status: GENERATION_STATUS.COMPLETED,
        duration_ms: Date.now() - startedAt,
        attempts: attempt,
      },
      "generation.end",
    );

    return result;
  } catch (error) {
    const failure = classifyGeminiError(error);
    const willRetry = failure.retryable && attempt < maxAttempts;

    await heartbeat(
      willRetry
        ? {
            // Back to QUEUED while BullMQ waits; the attempt shown is the one coming up
            generation_status: GENERATION_STATUS.QUEUED,
            generation_stage: null,
            generation_attempt: attempt + 1,
            generation_error: failure.message,
            generation_error_code: failure.code,
          }
        : {
            generation_status: GENERATION_STATUS.FAILED,
            generation_stage: null,
            generation_error: failure.message,
            generation_error_code: failure.code,
            generation_completed_at: new Date(),
          },
    );

    const fields = {
      err: error,
      status: willRetry ? "RETRYING" : GENERATION_STATUS.FAILED,
      error_code: failure.code,
      duration_ms: Date.now() - startedAt,
      attempts: attempt,
    };

    if (failure.code === GENERATION_ERROR_CODE.BILLING)
      log.error(
        fields,
        "generation.end: Gemini billing problem, check prepaid credits",
      );
    else log.warn(fields, "generation.end");

    // UnrecoverableError makes BullMQ skip the remaining attempts
    throw willRetry ? failure : new UnrecoverableError(failure.message);
  }
};

export const getInviteCardGenerationStatusService = async (
  id: string,
  userId: string,
) => {
  let inviteCard = await findAiEventInviteCardById(id);

  if (!inviteCard) throw new ApiError(404, "AI Invite Card Not Found");

  const ownershipEvent = await verifyWeddingEventOwnershipService(
    inviteCard.event_id,
    userId,
  );

  if (!ownershipEvent)
    throw new ApiError(400, "Invalid Invite card or Invite card Not Found");

  // A worker that died mid-run can never write its own failure, so the page would
  // poll a PROCESSING card forever. Retire it here instead.
  if (
    (inviteCard.generation_status === GENERATION_STATUS.QUEUED ||
      inviteCard.generation_status === GENERATION_STATUS.PROCESSING) &&
    isGenerationStale(inviteCard)
  ) {
    inviteCard = await updateAiEventInviteCard(inviteCard.id, {
      generation_status: GENERATION_STATUS.FAILED,
      generation_stage: null,
      generation_error: "Generation timed out. Please try again.",
      generation_error_code: GENERATION_ERROR_CODE.TIMEOUT,
      generation_completed_at: new Date(),
    });
  }

  return {
    id: inviteCard.id,
    event_id: inviteCard.event_id,
    status: inviteCard.generation_status,
    stage: inviteCard.generation_stage,
    error: inviteCard.generation_error,
    error_code: inviteCard.generation_error_code,
    attempt: inviteCard.generation_attempt,
    max_attempts: MAX_GENERATION_ATTEMPTS,
    job_id: inviteCard.generation_job_id,
    generated_invite_image_url: inviteCard.generated_invite_image_url,
    started_at: inviteCard.generation_started_at,
    completed_at: inviteCard.generation_completed_at,
  };
};
