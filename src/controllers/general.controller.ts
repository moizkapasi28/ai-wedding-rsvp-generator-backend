import { type Request, type Response } from "express";
import { sendSuccess } from "../utils/response.util";
import {
  GenerateS3PresignedUploadURLDto,
  GenerateS3PresignedViewURLDto,
} from "../validations/general.validation";
import {
  generateS3PresignedUploadUrlService,
  generateS3PresignedViewUrlService,
} from "../services/general.service";

export const generateS3PresignedUploadUrl = async (
  req: Request<{}, {}, GenerateS3PresignedUploadURLDto>,
  res: Response,
): Promise<Response> => {
  const { user, body } = req;

  const url = await generateS3PresignedUploadUrlService(
    user.id,
    body.object_key,
    body.mime_type,
  );

  return sendSuccess(res, "Presigned url generated successfully", url, 200);
};

export const generateS3PresignedViewURL = async (
  req: Request<{}, {}, GenerateS3PresignedViewURLDto>,
  res: Response,
) => {
  const { user, body } = req;

  const url = await generateS3PresignedViewUrlService(user.id, body.object_key);

  return sendSuccess(res, "Presigned url generated successfully", url, 200);
};
