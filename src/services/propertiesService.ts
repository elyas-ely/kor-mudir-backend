import { type SQL, and, count, desc, eq, gte, lt, lte, like, or } from 'drizzle-orm';
import { db } from '../db';
import { properties } from '../db/schema';
import type { Property } from '../db/schema/properties';
import type { createPropertySchema, propertyListQuerySchema } from '../db/validation';
import type { CursorPage } from '../types/common';
import type { ActingUser } from '../types/hono';
import { decodeCursor, encodeCursor } from '../utils/cursor';
import { uploadsService } from './uploadsService';

type PropertyListParams = ReturnType<typeof propertyListQuerySchema.parse>;
type NewPropertyInput = ReturnType<typeof createPropertySchema.parse>;

/**
 * Keyset cursor: the last-seen row's id. `id` is a serial PK assigned in
 * insert order, so ordering by it descending is equivalent to newest-first
 * and needs no timestamp tie-breaker — which also avoids the ms-vs-µs
 * precision mismatch a `created_at` cursor round-tripped through JS would hit.
 */
interface PropertyCursor {
  id: number;
}

/** Admins see every property; regular users only see their own. */
function scopeToOwner(actingUser: ActingUser): SQL | undefined {
  return actingUser.role === 'admin' ? undefined : eq(properties.userId, actingUser.id);
}

export const propertiesService = {
  async getProperties(
    actingUser: ActingUser,
    {
      search,
      propertyType,
      purpose,
      currency,
      minPrice,
      maxPrice,
      bedroomsMin,
      bathroomsMin,
      buildingSizeUnit,
      minBuildingSize,
      maxBuildingSize,
      landSizeUnit,
      minLandSize,
      maxLandSize,
      cursor,
      limit,
    }: PropertyListParams,
  ): Promise<CursorPage<Property>> {
    const filters: SQL[] = [];
    const ownerFilter = scopeToOwner(actingUser);
    if (ownerFilter) filters.push(ownerFilter);
    if (search) {
      const searchFilter = or(like(properties.code, `%${search}%`), like(properties.address, `%${search}%`));
      if (searchFilter) filters.push(searchFilter);
    }
    if (propertyType) filters.push(eq(properties.propertyType, propertyType));
    if (purpose) filters.push(eq(properties.purpose, purpose));
    if (currency) filters.push(eq(properties.currency, currency));
    if (minPrice !== undefined) filters.push(gte(properties.price, minPrice));
    if (maxPrice !== undefined) filters.push(lte(properties.price, maxPrice));
    if (bedroomsMin !== undefined) filters.push(gte(properties.bedrooms, bedroomsMin));
    if (bathroomsMin !== undefined) filters.push(gte(properties.bathrooms, bathroomsMin));
    if (buildingSizeUnit) filters.push(eq(properties.buildingSizeUnit, buildingSizeUnit));
    if (minBuildingSize !== undefined) filters.push(gte(properties.buildingSize, minBuildingSize));
    if (maxBuildingSize !== undefined) filters.push(lte(properties.buildingSize, maxBuildingSize));
    if (landSizeUnit) filters.push(eq(properties.landSizeUnit, landSizeUnit));
    if (minLandSize !== undefined) filters.push(gte(properties.landSize, minLandSize));
    if (maxLandSize !== undefined) filters.push(lte(properties.landSize, maxLandSize));

    // filters up to here scope both the page query and the total count; the cursor
    // predicate below must only affect the page query, so it's added after copying.
    const countWhere: SQL | undefined = filters.length ? and(...filters) : undefined;

    if (cursor) {
      const { id } = decodeCursor<PropertyCursor>(cursor);
      filters.push(lt(properties.id, id));
    }
    const where: SQL | undefined = filters.length ? and(...filters) : undefined;

    const rows = await db
      .select()
      .from(properties)
      .where(where)
      .orderBy(desc(properties.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const last = data[data.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor({ id: last.id } satisfies PropertyCursor) : null;

    const [totalRow] = await db.select({ total: count() }).from(properties).where(countWhere);

    return { data, nextCursor, total: totalRow?.total ?? 0 };
  },

  async getProperty(actingUser: ActingUser, id: number): Promise<Property | undefined> {
    const ownerFilter = scopeToOwner(actingUser);
    const where = ownerFilter ? and(eq(properties.id, id), ownerFilter) : eq(properties.id, id);
    const [property] = await db.select().from(properties).where(where).limit(1);
    return property;
  },

  async createProperty(actingUser: ActingUser, data: NewPropertyInput): Promise<Property> {
    const [property] = await db
      .insert(properties)
      .values({ ...data, userId: actingUser.id })
      .returning();
    if (!property) throw new Error('Failed to create property');
    return property;
  },

  async updateProperty(
    actingUser: ActingUser,
    id: number,
    data: Partial<NewPropertyInput>,
  ): Promise<Property | undefined> {
    const ownerFilter = scopeToOwner(actingUser);
    const where = ownerFilter ? and(eq(properties.id, id), ownerFilter) : eq(properties.id, id);

    // drop keys the client sent as undefined so an all-undefined payload
    // (e.g. "cleared the photo, changed nothing else") is a no-op rather than
    // a drizzle "No values to set" crash. `null` is kept — it clears a column.
    const patch = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as Partial<NewPropertyInput>;

    if (Object.keys(patch).length === 0) {
      const [current] = await db.select().from(properties).where(where).limit(1);
      return current;
    }

    // if the image is being replaced or cleared, note the old key so its R2
    // object can be removed after the row is updated.
    let previousImageKey: string | null = null;
    if ('imageKey' in patch) {
      const [current] = await db
        .select({ imageKey: properties.imageKey })
        .from(properties)
        .where(where)
        .limit(1);
      previousImageKey = current?.imageKey ?? null;
    }

    const [property] = await db.update(properties).set(patch).where(where).returning();
    if (!property) return undefined;

    if (previousImageKey && previousImageKey !== property.imageKey) {
      try {
        await uploadsService.deleteObject(previousImageKey);
      } catch (err) {
        console.error(`Failed to delete replaced R2 object for property ${id}:`, err);
      }
    }

    return property;
  },

  async deleteProperty(actingUser: ActingUser, id: number): Promise<boolean> {
    const ownerFilter = scopeToOwner(actingUser);
    const where = ownerFilter ? and(eq(properties.id, id), ownerFilter) : eq(properties.id, id);
    const [deleted] = await db.delete(properties).where(where).returning();
    if (!deleted) return false;

    // best-effort cleanup of the property's R2 image; a failed delete here must
    // not fail the request — the DB row is already gone. Deleting a missing key
    // is a no-op (see uploadsService.deleteObject).
    if (deleted.imageKey) {
      try {
        await uploadsService.deleteObject(deleted.imageKey);
      } catch (err) {
        console.error(`Failed to delete R2 object for property ${id}:`, err);
      }
    }
    return true;
  },
};
