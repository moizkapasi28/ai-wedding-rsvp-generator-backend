const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const validateImageInput = async (
  buffer: Buffer,
  contentType: string | undefined,
): Promise<string> => {
  const normalizedContentType = contentType?.toLowerCase();

  if (
    !normalizedContentType ||
    !SUPPORTED_IMAGE_MIME_TYPES.includes(normalizedContentType)
  ) {
    throw new Error(
      `Unsupported or missing content type: "${contentType}". Expected one of: ${SUPPORTED_IMAGE_MIME_TYPES.join(", ")}`,
    );
  }

  if (!buffer || buffer.length === 0) {
    throw new Error("Image buffer is empty.");
  }

  return normalizedContentType;
};
