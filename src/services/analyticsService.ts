import { and, count, eq } from 'drizzle-orm';
import { db } from '../db';
import { contacts, customers, properties } from '../db/schema';
import { propertyPurposeEnum, propertyTypeEnum } from '../db/schema/properties';
import type { ActingUser } from '../types/hono';

type PropertyType = (typeof propertyTypeEnum.enumValues)[number];
type PropertyPurpose = (typeof propertyPurposeEnum.enumValues)[number];

export interface AnalyticsOverview {
  properties: {
    total: number;
    byType: Record<PropertyType, number>;
    byPurpose: Record<PropertyPurpose, number>;
  };
  owners: number;
  customers: number;
}

/** Turn `GROUP BY` rows into a fully-populated record — every enum key
 * present, missing buckets zero-filled — so the client never has to guard. */
function tally<K extends string>(keys: readonly K[], rows: { key: K | null; n: number }[]) {
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  for (const row of rows) {
    if (row.key != null) out[row.key] = row.n;
  }
  return out;
}

export const analyticsService = {
  /**
   * Every number the Analytics screen needs, in one round trip. All counts
   * are aggregated in Postgres (`count(*)` / `GROUP BY`) — no rows cross the
   * wire. Admins see totals across all tenants; everyone else sees their own.
   */
  async getOverview(actingUser: ActingUser): Promise<AnalyticsOverview> {
    const isAdmin = actingUser.role === 'admin';
    const propertyScope = isAdmin ? undefined : eq(properties.userId, actingUser.id);
    const customerScope = isAdmin ? undefined : eq(customers.userId, actingUser.id);
    const ownerScope = isAdmin
      ? eq(contacts.kind, 'owner')
      : and(eq(contacts.userId, actingUser.id), eq(contacts.kind, 'owner'));

    const [byTypeRows, byPurposeRows, [ownersRow], [customersRow]] = await Promise.all([
      db
        .select({ key: properties.propertyType, n: count() })
        .from(properties)
        .where(propertyScope)
        .groupBy(properties.propertyType),
      db
        .select({ key: properties.purpose, n: count() })
        .from(properties)
        .where(propertyScope)
        .groupBy(properties.purpose),
      db.select({ n: count() }).from(contacts).where(ownerScope),
      db.select({ n: count() }).from(customers).where(customerScope),
    ]);

    const byType = tally(propertyTypeEnum.enumValues, byTypeRows);
    const byPurpose = tally(propertyPurposeEnum.enumValues, byPurposeRows);
    const total = Object.values(byType).reduce((sum, n) => sum + n, 0);

    return {
      properties: { total, byType, byPurpose },
      owners: ownersRow?.n ?? 0,
      customers: customersRow?.n ?? 0,
    };
  },
};
