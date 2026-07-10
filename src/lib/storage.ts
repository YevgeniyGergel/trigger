import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const bucketName = process.env.R2_BUCKET_NAME;

export const r2Client = new S3Client({
  region: "auto",
  endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

/**
 * Session-note audio lives in a private R2 bucket — R2 encrypts objects at
 * rest by default, and this module never constructs a public object URL.
 * The only read path is getSignedAudioUrl below, so every access is a
 * short-TTL signed URL scoped to the requesting psychologist (see
 * requireCurrentPsychologist calls at each note-actions.ts/page.tsx call
 * site). Keep it that way: don't add a route that proxies or exposes
 * `key` directly, and don't flip the bucket to public in R2 settings.
 */
export async function uploadAudioObject(key: string, body: Buffer, contentType: string) {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

export async function getSignedAudioUrl(key: string, expiresInSeconds = 300) {
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}
