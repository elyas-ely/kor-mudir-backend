import { type SQL, and, count, desc, eq, lt, like, or } from 'drizzle-orm';
import { db } from '../db';
import { customers } from '../db/schema';
import type { Customer } from '../db/schema/customers';
import type { createCustomerSchema, customerListQuerySchema } from '../db/validation';
import type { CursorPage } from '../types/common';
import type { ActingUser } from '../types/hono';
import { decodeCursor, encodeCursor } from '../utils/cursor';

type CustomerListParams = ReturnType<typeof customerListQuerySchema.parse>;
type NewCustomerInput = ReturnType<typeof createCustomerSchema.parse>;

/**
 * Keyset cursor: the last-seen row's id. `id` is a serial PK assigned in
 * insert order, so ordering by it descending is equivalent to newest-first
 * without a timestamp tie-breaker — which also avoids the ms-vs-µs precision
 * mismatch a `created_at` cursor round-tripped through JS would hit.
 */
interface CustomerCursor {
  id: number;
}

/** Admins see every customer; regular users only see their own. */
function scopeToOwner(actingUser: ActingUser): SQL | undefined {
  return actingUser.role === 'admin' ? undefined : eq(customers.userId, actingUser.id);
}

export const customersService = {
  async getCustomers(
    actingUser: ActingUser,
    { search, interestedPropertyType, interestedPurpose, cursor, limit }: CustomerListParams,
  ): Promise<CursorPage<Customer>> {
    const filters: SQL[] = [];
    const ownerFilter = scopeToOwner(actingUser);
    if (ownerFilter) filters.push(ownerFilter);
    if (search) {
      const searchFilter = or(
        like(customers.name, `%${search}%`),
        like(customers.phone, `%${search}%`),
        like(customers.whatsapp, `%${search}%`),
      );
      if (searchFilter) filters.push(searchFilter);
    }
    if (interestedPropertyType) filters.push(eq(customers.interestedPropertyType, interestedPropertyType));
    if (interestedPurpose) filters.push(eq(customers.interestedPurpose, interestedPurpose));

    // filters up to here scope both the page query and the total count; the cursor
    // predicate below must only affect the page query, so it's added after copying.
    const countWhere: SQL | undefined = filters.length ? and(...filters) : undefined;

    if (cursor) {
      const { id } = decodeCursor<CustomerCursor>(cursor);
      filters.push(lt(customers.id, id));
    }
    const where: SQL | undefined = filters.length ? and(...filters) : undefined;

    const rows = await db
      .select()
      .from(customers)
      .where(where)
      .orderBy(desc(customers.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const last = data[data.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor({ id: last.id } satisfies CustomerCursor) : null;

    const [totalRow] = await db.select({ total: count() }).from(customers).where(countWhere);

    return { data, nextCursor, total: totalRow?.total ?? 0 };
  },

  async getCustomer(actingUser: ActingUser, id: number): Promise<Customer | undefined> {
    const ownerFilter = scopeToOwner(actingUser);
    const where = ownerFilter ? and(eq(customers.id, id), ownerFilter) : eq(customers.id, id);
    const [customer] = await db.select().from(customers).where(where).limit(1);
    return customer;
  },

  async createCustomer(actingUser: ActingUser, data: NewCustomerInput): Promise<Customer> {
    const [customer] = await db
      .insert(customers)
      .values({ ...data, userId: actingUser.id })
      .returning();
    if (!customer) throw new Error('Failed to create customer');
    return customer;
  },

  async updateCustomer(
    actingUser: ActingUser,
    id: number,
    data: Partial<NewCustomerInput>,
  ): Promise<Customer | undefined> {
    const ownerFilter = scopeToOwner(actingUser);
    const where = ownerFilter ? and(eq(customers.id, id), ownerFilter) : eq(customers.id, id);
    const [customer] = await db.update(customers).set(data).where(where).returning();
    return customer;
  },

  async deleteCustomer(actingUser: ActingUser, id: number): Promise<boolean> {
    const ownerFilter = scopeToOwner(actingUser);
    const where = ownerFilter ? and(eq(customers.id, id), ownerFilter) : eq(customers.id, id);
    const [deleted] = await db.delete(customers).where(where).returning();
    return Boolean(deleted);
  },
};
