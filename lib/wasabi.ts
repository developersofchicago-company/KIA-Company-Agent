import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

export function createWasabiClient() {
  return new S3Client({
    endpoint: process.env.WASABI_ENDPOINT,
    region: process.env.WASABI_REGION ?? "ap-southeast-1",
    credentials: {
      accessKeyId: process.env.WASABI_ACCESS_KEY!,
      secretAccessKey: process.env.WASABI_SECRET_KEY!,
    },
    forcePathStyle: true,
  });
}

export const WASABI_BUCKET = process.env.WASABI_BUCKET_NAME!;

export async function uploadToWasabi(
  key: string,
  body: Buffer,
  contentType: string,
) {
  const s3 = createWasabiClient();
  await s3.send(
    new PutObjectCommand({
      Bucket: WASABI_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600) {
  const s3 = createWasabiClient();
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: WASABI_BUCKET, Key: key }),
    { expiresIn },
  );
}

export async function deleteFromWasabi(key: string) {
  const s3 = createWasabiClient();
  await s3.send(
    new DeleteObjectCommand({ Bucket: WASABI_BUCKET, Key: key }),
  );
}

// Generate presigned POST URL for direct browser upload (files up to 50MB)
export async function getPresignedPostUrl(
  key: string,
  contentType: string,
  maxFileSize: number = 50 * 1024 * 1024, // 50MB default
) {
  const s3 = createWasabiClient();
  const { url, fields } = await createPresignedPost(s3, {
    Bucket: WASABI_BUCKET,
    Key: key,
    Conditions: [
      ["content-length-range", 0, maxFileSize],
      ["eq", "$Content-Type", contentType],
    ],
    Fields: {
      "Content-Type": contentType,
    },
    Expires: 300, // 5 minutes
  });

  return { url, fields, key };
}

// Generate presigned PUT URL for single file upload
export async function getPresignedPutUrl(
  key: string,
  contentType: string,
  expiresIn = 300,
) {
  const s3 = createWasabiClient();
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: WASABI_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn },
  );
  return { url, key };
}
