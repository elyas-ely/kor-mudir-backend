import { AwsClient } from 'aws4fetch';
import { env } from '../lib/env';

/** Allowed image content types → file extension used in the object key. */
const CONTENT_TYPE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const ALLOWED_IMAGE_TYPES = Object.keys(CONTENT_TYPE_EXT);

// Presigned URLs are short-lived; the client must PUT the file within this window.
const PRESIGN_TTL_SECONDS = 300;

export interface PresignResult {
  uploadUrl: string;
  key: string;
}

/** S3-compatible client + endpoint for the R2 bucket, from credentials in the environment. */
function r2() {
  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  });
  const objectUrl = (key: string) =>
    `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET}/${key}`;
  return { client, objectUrl };
}

export const uploadsService = {
  /**
   * Presign an S3-compatible PUT URL so the client can upload straight to R2.
   *
   * Note: a presigned PUT cannot strictly enforce a max object size (that would
   * require signing the Content-Length header). Size is enforced client-side;
   * add an R2 lifecycle/size guard later if strict server enforcement is needed.
   */
  async presignPut(userId: string, contentType: string): Promise<PresignResult | null> {
    const ext = CONTENT_TYPE_EXT[contentType];
    if (!ext) return null;

    // properties are the only resource with images today.
    const key = `properties/${userId}/${crypto.randomUUID()}.${ext}`;
    const { client, objectUrl } = r2();

    const signed = await client.sign(
      new Request(`${objectUrl(key)}?X-Amz-Expires=${PRESIGN_TTL_SECONDS}`, { method: 'PUT' }),
      { aws: { signQuery: true } },
    );

    return { uploadUrl: signed.url, key };
  },

  /**
   * Delete an object from R2 via the S3 API. Deleting a missing key returns
   * 204, so this is safe to call unconditionally.
   */
  async deleteObject(key: string): Promise<void> {
    const { client, objectUrl } = r2();
    const res = await client.fetch(objectUrl(key), { method: 'DELETE' });
    if (!res.ok && res.status !== 404) {
      throw new Error(`R2 delete failed for ${key}: ${res.status}`);
    }
  },
};
