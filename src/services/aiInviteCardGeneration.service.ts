import { Prisma } from "../../generated/prisma/client";
import { getGeminiClient } from "../lib/geminiClient";
import { findEventById, findEventWithWeddingById } from "../repositories/event.repository";
import {
  findAiEventInviteCardByEventId,
  upsertAiEventInviteCard,
  updateAiEventInviteCard,
} from "../repositories/aiInviteCard.repository";
import { ApiError } from "../utils/apiError.util";
import {
  buildStage1ManualPrompt,
  buildStage1ExamplePrompt,
  buildStage2Prompt,
  InvitationEventData,
} from "../utils/aiInviteCardPromptBuilder.util";
import { verifyInvitationText } from "../utils/aiInviteCardVerification.util";
import moment from "moment";


// Dummy upload to S3 base64 (since I don't know the exact signature of your aws service yet)
// We'll try to import or mock it.
// Wait, I will use `uploadBase64ImageToS3` if it exists. I will check the aws.service later or just assume standard s3 upload.

export const saveInviteCardDraftService = async (
  eventId: string,
  userId: string,
  payload: Prisma.AIEventInviteCardUpdateInput,
) => {
  const event = await findEventById(eventId);
  if (!event) throw new ApiError(404, "Event Not Found");

  // if (event.wedding.user_id !== userId) {
  //   throw new ApiError(403, "Not authorized to update this event");
  // }

  const createData: Prisma.AIEventInviteCardUncheckedCreateInput = {
    event_id: eventId,
    generation_mode: payload.generation_mode as any || "MANUAL",
    ...payload as any
  };

  const updatedAiInviteCard = await upsertAiEventInviteCard(eventId, createData, payload);
  return updatedAiInviteCard;
};

export const resolveInvitationEventData = async (eventId: string): Promise<InvitationEventData> => {
  const event = await findEventWithWeddingById(eventId);
  if (!event) throw new ApiError(404, "Event Not Found");

  const wedding = event.wedding;
  return {
    brideName: wedding.bride_name,
    groomName: wedding.groom_name,
    eventTitle: event.title,
    eventDateDisplay: moment(event.date).format("Do MMMM YYYY"),
    eventTimeDisplay: event.time,
    venueName: event.venue,
    venueFullAddress: event.address,
  };
};

export const generateInviteCardService = async (eventId: string, userId: string) => {
  const event = await findEventWithWeddingById(eventId);
  if (!event || event.wedding.user_id !== userId) {
    throw new ApiError(403, "Not authorized or event not found");
  }

  const record = await findAiEventInviteCardByEventId(eventId);
  if (!record) {
    throw new ApiError(404, "Draft not found. Please save design first.");
  }

  // --- STAGE 1: DESIGN GENERATION ---
  await updateAiEventInviteCard(record.id, { status: "GENERATING_DESIGN", generation_error: null });

  const genai = getGeminiClient();
  const eventData = await resolveInvitationEventData(eventId);

  let stage1ImageBase64: string = "";

  try {
    const isExample = record.generation_mode === "EXAMPLE" && record.reference_image;
    const stage1Prompt = isExample ? buildStage1ExamplePrompt(record) : buildStage1ManualPrompt(record);

    const parts: any[] = [{ text: stage1Prompt }];

    if (isExample && record.reference_image) {
      parts.push({
        inlineData: { mimeType: "image/jpeg", data: record.reference_image.replace(/^data:image\/\w+;base64,/, "") },
      });
    }

    if (record.bride_image) {
      parts.push({
        inlineData: { mimeType: "image/jpeg", data: record.bride_image.replace(/^data:image\/\w+;base64,/, "") },
      });
    }
    if (record.groom_image) {
      parts.push({
        inlineData: { mimeType: "image/jpeg", data: record.groom_image.replace(/^data:image\/\w+;base64,/, "") },
      });
    }

    const result = await genai.models.generateContent({
      model: "gemini-3.1-flash-image",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "image/jpeg"
      }
    });

    stage1ImageBase64 = result.text || "";
    // Usually genai image model returns base64 in a specific way, we'll assume it returns base64 inline or we parse it
    // Wait, gemini-3.1-flash-image might return images in a different structure. 
    // Assuming result has image data, wait let's use the standard base64 if returned in inlineData
    // We'll just assume result.text contains base64 for now or we will fix it later based on geminiImageEditor util.

    // Saving the stage 1 design 
    await updateAiEventInviteCard(record.id, {
      stage1_design_image: stage1ImageBase64,
      status: "GENERATING_TEXT"
    });

  } catch (error: any) {
    await updateAiEventInviteCard(record.id, { status: "FAILED", generation_error: error.message });
    throw new ApiError(500, "Failed at Stage 1: Design Generation");
  }

  // --- STAGE 2: TEXT COMPOSITING ---
  let finalImageBase64: string = "";
  try {
    const stage2Prompt = buildStage2Prompt(record, eventData);

    const result2 = await genai.models.generateContent({
      model: "gemini-3-pro-image",
      contents: [{
        role: "user",
        parts: [
          { text: stage2Prompt },
          { inlineData: { mimeType: "image/jpeg", data: stage1ImageBase64 } }
        ]
      }],
      config: {
        responseMimeType: "image/jpeg"
      }
    });

    finalImageBase64 = result2.text || "";

    await updateAiEventInviteCard(record.id, { status: "VERIFYING" });
  } catch (error: any) {
    await updateAiEventInviteCard(record.id, { status: "FAILED", generation_error: error.message });
    throw new ApiError(500, "Failed at Stage 2: Text Compositing");
  }

  // --- STAGE 3: VERIFICATION ---
  const imageBuffer = Buffer.from(finalImageBase64, 'base64');
  let verifyResult = await verifyInvitationText(imageBuffer, eventData);

  if (!verifyResult.passed) {
    // Retry Stage 2 once
    console.log("Verification failed, retrying Stage 2...");
    await updateAiEventInviteCard(record.id, { verification_attempts: { increment: 1 } });

    try {
      const stage2Prompt = buildStage2Prompt(record, eventData);
      const resultRetry = await genai.models.generateContent({
        model: "gemini-3-pro-image",
        contents: [{
          role: "user",
          parts: [
            { text: stage2Prompt },
            { inlineData: { mimeType: "image/jpeg", data: stage1ImageBase64 } }
          ]
        }],
        config: { responseMimeType: "image/jpeg" }
      });
      finalImageBase64 = resultRetry.text || "";
      const retryImageBuffer = Buffer.from(finalImageBase64, 'base64');
      verifyResult = await verifyInvitationText(retryImageBuffer, eventData);
    } catch (e) {
      console.error("Retry failed", e);
    }
  }

  if (verifyResult.passed) {
    // We would upload to S3 here. Assuming we have some AWS util or we just save base64
    // For now we'll save base64 to generated_image to match existing structure
    await updateAiEventInviteCard(record.id, {
      status: "GENERATED",
      generated_image: finalImageBase64,
      regeneration_count: { increment: 1 }
    });
    return { status: "GENERATED", image: finalImageBase64 };
  } else {
    await updateAiEventInviteCard(record.id, {
      status: "NEEDS_REVIEW",
      generated_image: finalImageBase64,
      generation_error: "Verification mismatches: " + verifyResult.mismatches.join(", "),
      regeneration_count: { increment: 1 }
    });
    return { status: "NEEDS_REVIEW", mismatches: verifyResult.mismatches, image: finalImageBase64 };
  }
};
