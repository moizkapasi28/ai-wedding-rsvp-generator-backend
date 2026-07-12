import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

interface S3BufferResponse {
  buffer: Buffer;
  contentType: string;
}

interface PresignedUrlOperation {
  operation: "putObject" | "getObject";
}

// Create an S3 client
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const generatePresignedUrl = async (
  bucketName: string,
  key: string,
  expiresIn: number,
  operation: "putObject" | "getObject",
  mimeType: string = "",
): Promise<string> => {
  let command: PutObjectCommand | GetObjectCommand;

  if (operation === "putObject") {
    command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: mimeType,
    });
  } else {
    command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
  }
  return await getSignedUrl(s3Client, command, { expiresIn });
};

export const getBufferFromS3 = async (
  s3Key: string,
): Promise<S3BufferResponse> => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: s3Key,
  });
  const response = await s3Client.send(command);
  if (!response.Body)
    throw new Error(`Failed to read object from S3 key: ${s3Key}`);

  const chunks: Buffer[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(Buffer.from(chunk));
  }

  return {
    buffer: Buffer.concat(chunks),
    contentType: response.ContentType || "image/png",
  };
};

export const uploadBufferToS3 = async (
  fileBuffer: Buffer,
  folder: string,
  mime_type: string,
): Promise<string> => {
  const fileExtension = mime_type.split("/")[1] || "png";

  const uniqueKey = `${folder}/${uuidv4()}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: uniqueKey,
    Body: fileBuffer,
    ContentType: mime_type,
  });

  await s3Client.send(command);

  return uniqueKey;
};
