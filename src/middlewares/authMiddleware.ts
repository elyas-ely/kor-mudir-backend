import type { Context, Next } from 'hono';
import { auth } from '../lib/auth';
import type { AppEnv } from '../types/hono';
import { ApiError } from '../utils/ApiError';

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  const result = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!result) {
    throw new ApiError(401, 'Unauthorized');
  }

  c.set('user', result.user);
  c.set('session', result.session);
  await next();
}
