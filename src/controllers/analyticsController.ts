import type { Context } from 'hono';
import { analyticsService } from '../services/analyticsService';
import type { AppEnv } from '../types/hono';
import { ApiError } from '../utils/ApiError';
import { ok } from '../utils/respond';

export const analyticsController = {
  async overview(c: Context<AppEnv>) {
    const currentUser = c.get('user');
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    return ok(c, await analyticsService.getOverview(currentUser));
  },
};
