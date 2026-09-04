import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins';
import { db } from '../db';
import * as schema from '../db/schema';
import { env } from './env';
import { trialEndsAtFrom } from './trial';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  // the Expo app's deep-link scheme (app.json `expo.scheme`) — required by the
  // expo() plugin below so its OAuth redirect back into the app is trusted.
  trustedOrigins: [`${env.EXPO_SCHEME}://`],
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'user',
        input: false,
      },
      // 5-month free trial starting at sign-up; not client-settable.
      trialEndsAt: {
        type: 'date',
        required: true,
        defaultValue: () => trialEndsAtFrom(),
        input: false,
      },
    },
  },
  // bearer(): issues/accepts bearer tokens instead of relying on cookies (RN has
  // no cross-origin cookie jar). expo(): @better-auth/expo's server-side half —
  // wires the deep-link OAuth callback and lets the client store the session via
  // SecureStore.
  plugins: [bearer(), expo()],
});
