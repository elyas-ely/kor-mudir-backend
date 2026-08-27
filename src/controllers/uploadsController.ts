import type { Context } from 'hono';
import { presignUploadSchema } from '../db/validation';
import { uploadsService } from '../services/uploadsService';
import type { AppEnv } from '../types/hono';
import { ApiError } from '../utils/ApiError';
import { ok } from '../utils/respond';

export const uploadsController = {
  async presign(c: Context<AppEnv>) {
    const currentUser = c.get('user');
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    const body = presignUploadSchema.parse(await c.req.json());
    const result = await uploadsService.presignPut(currentUser.id, body.contentType);
    if (!result) throw new ApiError(400, 'Unsupported content type');

    return ok(c, result);
  },
};
