import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
