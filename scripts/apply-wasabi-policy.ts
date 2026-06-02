import { S3Client, PutBucketPolicyCommand, GetBucketPolicyCommand } from "@aws-sdk/client-s3";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envContent = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
for (const line of envContent.split("\n")) {
  const t = line.trim().replace(/^﻿/, "");
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
}

const bucket = process.env.WASABI_BUCKET_NAME!;

function client() {
  return new S3Client({
    endpoint: process.env.WASABI_ENDPOINT,
    region: process.env.WASABI_REGION ?? "us-central-1",
    credentials: {
      accessKeyId: process.env.WASABI_ACCESS_KEY!,
      secretAccessKey: process.env.WASABI_SECRET_KEY!,
    },
    forcePathStyle: true,
  });
}

async function main() {
  const s3 = client();
  const policy = readFileSync(resolve(process.cwd(), "wasabi-bucket-policy.json"), "utf-8");

  console.log(`Applying bucket policy to "${bucket}" ...`);
  await s3.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: policy }));
  console.log("✓ Policy applied.");

  // Read it back to confirm
  const got = await s3.send(new GetBucketPolicyCommand({ Bucket: bucket }));
  console.log("✓ Active policy on bucket:");
  console.log(got.Policy);
}

main().catch((err) => {
  console.error("✗ Failed:", err?.name, "-", err?.message);
  process.exit(1);
});
