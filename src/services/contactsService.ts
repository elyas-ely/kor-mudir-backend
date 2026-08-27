import { type SQL, and, asc, count, eq, gt, like, or } from 'drizzle-orm';
import { db } from '../db';
import { contacts } from '../db/schema';
import type { Contact } from '../db/schema/contacts';
import type { contactListQuerySchema, createContactSchema } from '../db/validation';
import type { CursorPage } from '../types/common';
import type { ActingUser } from '../types/hono';
import { decodeCursor, encodeCursor } from '../utils/cursor';

type ContactListParams = ReturnType<typeof contactListQuerySchema.parse>;
type NewContactInput = ReturnType<typeof createContactSchema.parse>;

/** Keyset cursor: the last-seen row's sort columns (name asc, id asc breaks ties). */
interface ContactCursor {
  name: string;
  id: number;
}

/** Admins see every contact; regular users only see their own. */
function scopeToOwner(actingUser: ActingUser): SQL | undefined {
  return actingUser.role === 'admin' ? undefined : eq(contacts.userId, actingUser.id);
}

export const contactsService = {
  async getContacts(
    actingUser: ActingUser,
    { search, kind, role, cursor, limit }: ContactListParams,
  ): Promise<CursorPage<Contact>> {
    const filters: SQL[] = [];
    const ownerFilter = scopeToOwner(actingUser);
    if (ownerFilter) filters.push(ownerFilter);
    if (search) {
      const searchFilter = or(
        like(contacts.name, `%${search}%`),
        like(contacts.phone, `%${search}%`),
        like(contacts.whatsapp, `%${search}%`),
      );
      if (searchFilter) filters.push(searchFilter);
    }
    if (kind) filters.push(eq(contacts.kind, kind));
    if (role) filters.push(eq(contacts.role, role));

    // filters up to here scope both the page query and the total count; the cursor
    // predicate below must only affect the page query, so it's added after copying.
    const countWhere: SQL | undefined = filters.length ? and(...filters) : undefined;

    if (cursor) {
      const { name, id } = decodeCursor<ContactCursor>(cursor);
      const keysetFilter = or(gt(contacts.name, name), and(eq(contacts.name, name), gt(contacts.id, id)));
      if (keysetFilter) filters.push(keysetFilter);
    }
    const where: SQL | undefined = filters.length ? and(...filters) : undefined;

    const rows = await db
      .select()
      .from(contacts)
      .where(where)
      .orderBy(asc(contacts.name), asc(contacts.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const last = data[data.length - 1];
    const nextCursor = hasMore && last ? encodeCursor({ name: last.name, id: last.id } satisfies ContactCursor) : null;

    const [totalRow] = await db.select({ total: count() }).from(contacts).where(countWhere);

    return { data, nextCursor, total: totalRow?.total ?? 0 };
  },

  async getContact(actingUser: ActingUser, id: number): Promise<Contact | undefined> {
    const ownerFilter = scopeToOwner(actingUser);
    const where = ownerFilter ? and(eq(contacts.id, id), ownerFilter) : eq(contacts.id, id);
    const [contact] = await db.select().from(contacts).where(where).limit(1);
    return contact;
  },

  async createContact(actingUser: ActingUser, data: NewContactInput): Promise<Contact> {
    const [contact] = await db
      .insert(contacts)
      .values({ ...data, userId: actingUser.id })
      .returning();
    if (!contact) throw new Error('Failed to create contact');
    return contact;
  },

  async updateContact(
    actingUser: ActingUser,
    id: number,
    data: Partial<NewContactInput>,
  ): Promise<Contact | undefined> {
    const ownerFilter = scopeToOwner(actingUser);
    const where = ownerFilter ? and(eq(contacts.id, id), ownerFilter) : eq(contacts.id, id);
    const [contact] = await db.update(contacts).set(data).where(where).returning();
    return contact;
  },

  async deleteContact(actingUser: ActingUser, id: number): Promise<boolean> {
    const ownerFilter = scopeToOwner(actingUser);
    const where = ownerFilter ? and(eq(contacts.id, id), ownerFilter) : eq(contacts.id, id);
    const [deleted] = await db.delete(contacts).where(where).returning();
    return Boolean(deleted);
  },
};
