import { ApiError } from "./apiError.util";

/** Every upload lands under this prefix; see generateS3PresignedUploadUrlService. */
export const userPrefix = (userId: string) => `users/${userId}/`;

/** The AI invite card fields that hold S3 object keys. */
export const AI_CARD_IMAGE_KEY_FIELDS = [
  "reference_image",
  "generated_image",
  "couple_raw_image_key",
  "generated_invite_image_url",
] as const;

/** The RSVP page-settings fields that hold S3 object keys. */
export const PAGE_SETTING_IMAGE_KEY_FIELDS = [
  "raw_image",
  "generated_image",
] as const;

/**
 * Rejects any client-supplied S3 key the caller doesn't own.
 *
 * The view-URL endpoint trusts any key one of the user's records references, so
 * letting a client write an arbitrary key onto a record would let them point it
 * at someone else's file and get a signed URL for it.
 *
 * A key is accepted when it's being cleared, when it's the value already stored
 * on the record (covers files uploaded before keys were namespaced), or when it
 * sits under the caller's own prefix.
 */
export const assertOwnedImageKeys = <F extends string>(
  userId: string,
  fields: readonly F[],
  current: Partial<Record<F, string | null>>,
  payload: Partial<Record<F, unknown>>,
) => {
  for (const field of fields) {
    const value = payload[field];
    if (value === undefined || value === null || value === current[field])
      continue;

    if (typeof value !== "string" || !value.startsWith(userPrefix(userId)))
      throw new ApiError(400, `Invalid image for ${field}`);
  }
};
