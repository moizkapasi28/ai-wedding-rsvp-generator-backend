import { type Request, type Response } from "express";
import { generatePresignedUrl } from "../services/aws.service";
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
  const { body } = req;

  const url = await generateS3PresignedUploadUrlService(
    body.object_key,
    body.mime_type,
  );

  console.log(url);

  return sendSuccess(res, "Presigned url generated successfully", { url }, 200);
};

export const generateS3PresignedViewURL = async (
  req: Request<{}, {}, GenerateS3PresignedViewURLDto>,
  res: Response,
) => {
  const { body } = req;

  const url = await generateS3PresignedViewUrlService(body.object_key);

  return sendSuccess(res, "Presigned url generated successfully", { url }, 200);
};
