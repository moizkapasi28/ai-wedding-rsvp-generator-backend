import { isObjectKeyReferencedByUser } from "../repositories/general.repository";
import { ApiError } from "../utils/apiError.util";
import { generatePresignedUrl } from "./aws.service";

const userPrefix = (userId: string) => `users/${userId}/`;

// Uploads always land under the uploader's own prefix, so nobody can overwrite another user's
// files. Clients save the returned object_key, so rewriting the requested key is safe.
export const generateS3PresignedUploadUrlService = async (
  userId: string,
  object_key: string,
  mime_type: string,
) => {
  const prefix = userPrefix(userId);
  const key = object_key.startsWith(prefix)
    ? object_key
    : `${prefix}${object_key.replace(/^\/+/, "")}`;

  const url = await generatePresignedUrl(
    process.env.AWS_BUCKET_NAME,
    key,
    Number(process.env.AWS_BUCKET_PUT_URL_EXPIRE),
    "putObject",
    mime_type,
  );

  if (!url) throw new Error("Failed to generate upload presigned url");

  return { url, object_key: key };
};

// Viewable: the user's own uploads, or a key saved on a record they own (older uploads and
// backend-generated images don't carry the user prefix)
export const generateS3PresignedViewUrlService = async (
  userId: string,
  object_key: string,
) => {
  const canView =
    object_key.startsWith(userPrefix(userId)) ||
    (await isObjectKeyReferencedByUser(userId, object_key));

  // 404 rather than 403, so the endpoint doesn't confirm other users' files exist
  if (!canView) throw new ApiError(404, "File not found");

  const url = await generatePresignedUrl(
    process.env.AWS_BUCKET_NAME,
    object_key,
    Number(process.env.AWS_BUCKET_PUT_URL_EXPIRE),
    "getObject",
  );

  if (!url) throw new Error("Failed to generate view presigned url");

  return { url, object_key };
};
