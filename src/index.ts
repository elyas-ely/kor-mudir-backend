import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';
import { auth } from './lib/auth';
import { env } from './lib/env';
import { apiRoutes } from './routes';
import type { AppEnv } from './types/hono';
import { ApiError } from './utils/ApiError';

const app = new Hono<AppEnv>();

app.use(
  '*',
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.get('/', (c) => c.json({ success: true, data: new Date().toISOString() }));

// better-auth's own handler (sign-in/social, get-session, sign-out, ...) —
// required by the @better-auth/expo client, distinct from the custom
// idToken-based /api/v1/auth/google endpoint.
app.on(['GET', 'POST'], '/api/auth/**', (c) => auth.handler(c.req.raw));

app.route('/api/v1', apiRoutes);

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json({ success: false, message: err.message }, err.status as ContentfulStatusCode);
  }

  if (err instanceof ZodError) {
    return c.json({ success: false, message: err.issues[0]?.message ?? 'Invalid request' }, 400);
  }

  console.error(err);
  return c.json({ success: false, message: 'Internal Server Error' }, 500);
});

export default {
  port: env.PORT,
  fetch: app.fetch,
};
