import { eq } from 'drizzle-orm';
import { db } from '../db';
import { user } from '../db/schema';
import type { updateProfileSchema } from '../db/validation';
import { ApiError } from '../utils/ApiError';

type UpdateProfileInput = ReturnType<typeof updateProfileSchema.parse>;

export const authService = {
  async listUsers() {
    return db.select().from(user);
  },

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const [updated] = await db.update(user).set(data).where(eq(user.id, userId)).returning();
    if (!updated) throw new ApiError(404, 'User not found');
    return updated;
  },

  async deleteUser(actingUserId: string, targetUserId: string) {
    if (actingUserId === targetUserId) {
      throw new ApiError(400, 'You cannot delete your own account');
    }

    const [deleted] = await db.delete(user).where(eq(user.id, targetUserId)).returning();

    if (!deleted) {
      throw new ApiError(404, 'User not found');
    }

    return deleted;
  },
};
