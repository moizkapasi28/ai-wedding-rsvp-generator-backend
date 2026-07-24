import { generatePresignedUrl } from "./aws.service";

export const generateS3PresignedUploadUrlService = async (
  object_key: string,
  mime_type: string,
) => {
  const url = await generatePresignedUrl(
    process.env.AWS_BUCKET_NAME,
    object_key,
    Number(process.env.AWS_BUCKET_PUT_URL_EXPIRE),
    "putObject",
    mime_type,
  );

  if (!url) throw new Error("Failed to generate upload presigned url");

  return url;
};

export const generateS3PresignedViewUrlService = async (object_key: string) => {
  const url = await generatePresignedUrl(
    process.env.AWS_BUCKET_NAME,
    object_key,
    Number(process.env.AWS_BUCKET_PUT_URL_EXPIRE),
    "getObject",
  );

  if (!url) throw new Error("Failed to generate view presigned url");

  return url;
};
