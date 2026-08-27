import type { Context } from 'hono';
import { googleAuthSchema, updateProfileSchema } from '../db/validation';
import { auth } from '../lib/auth';
import { authService } from '../services/authService';
import { subscriptionService } from '../services/subscriptionService';
import type { AppEnv } from '../types/hono';
import { ApiError } from '../utils/ApiError';
import { ok } from '../utils/respond';

export const authController = {
  async googleSignIn(c: Context<AppEnv>) {
    const body = googleAuthSchema.parse(await c.req.json());

    const result = await auth.api.signInSocial({
      body: {
        provider: 'google',
        idToken: { token: body.idToken },
        disableRedirect: true,
      },
    });

    if (!('token' in result) || !result.token || !result.user) {
      throw new ApiError(401, 'Google sign-in failed');
    }

    return ok(c, { token: result.token, user: result.user });
  },

  async logout(c: Context<AppEnv>) {
    await auth.api.signOut({ headers: c.req.raw.headers });
    return ok(c, null);
  },

  async me(c: Context<AppEnv>) {
    return ok(c, c.get('user'));
  },

  async updateMe(c: Context<AppEnv>) {
    const currentUser = c.get('user');
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    const input = updateProfileSchema.parse(await c.req.json());
    const updated = await authService.updateProfile(currentUser.id, input);
    return ok(c, updated);
  },

  // Deliberately a separate request from /auth/me — the client checks this
  // independently (and can re-check it any time) rather than assuming trial
  // status from the cached session user.
  async subscriptionStatus(c: Context<AppEnv>) {
    const currentUser = c.get('user');
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    return ok(c, subscriptionService.getStatus(currentUser));
  },

  async listUsers(c: Context<AppEnv>) {
    const currentUser = c.get('user');
    if (currentUser?.role !== 'admin') {
      throw new ApiError(403, 'Forbidden');
    }

    return ok(c, await authService.listUsers());
  },

  async deleteUser(c: Context<AppEnv, '/:id'>) {
    const currentUser = c.get('user');
    if (currentUser?.role !== 'admin') {
      throw new ApiError(403, 'Forbidden');
    }

    const targetId = c.req.param('id');
    const deleted = await authService.deleteUser(currentUser.id, targetId);
    return ok(c, deleted);
  },
};
