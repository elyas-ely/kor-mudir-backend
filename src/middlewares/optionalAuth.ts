import type { Context, Next } from 'hono';
import { auth } from '../lib/auth';
import type { AppEnv } from '../types/hono';

export async function optionalAuth(c: Context<AppEnv>, next: Next) {
  const result = await auth.api.getSession({ headers: c.req.raw.headers });

  c.set('user', result?.user ?? null);
  c.set('session', result?.session ?? null);
  await next();
}
