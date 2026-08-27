import { relations } from 'drizzle-orm';
import { index, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const contactKindEnum = pgEnum('contact_kind', ['owner', 'worker', 'friend']);

export const workerRoleEnum = pgEnum('worker_role', [
  'engineer',
  'electrician',
  'plumber',
  'housekeeper',
  'painter',
  'carpenter',
  'gardener',
  'security',
  'other',
]);

export const contacts = pgTable(
  'contacts',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    kind: contactKindEnum('kind').notNull(),
    // only meaningful when kind = 'worker'
    role: workerRoleEnum('role'),
    note: text('note'),
    phoneCountryIso: text('phone_country_iso'),
    phone: text('phone'),
    whatsappCountryIso: text('whatsapp_country_iso'),
    whatsapp: text('whatsapp'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // The list query is: WHERE user_id = ? [AND kind] [AND role] [AND search]
    // [AND (name, id) > :cursor] ORDER BY name ASC, id ASC LIMIT n  (keyset
    // pagination — see contactsService). (user_id, name, id) serves the
    // equality, the composite cursor range, and the full ordering with no
    // sort; kind/role are applied as cheap residual filters on the already
    // user-scoped, name-ordered scan. Leading user_id also covers the
    // ownership checks and the ON DELETE cascade.
    //
    // No (kind, name) index: without a leading user_id it only helps a
    // cross-tenant admin "list every contact of kind X" query, which no code
    // path issues, and kind is only ~33% selective — pure write overhead.
    index('contacts_user_id_name_id_idx').on(table.userId, table.name, table.id),
  ],
);

export const contactsRelations = relations(contacts, ({ one }) => ({
  user: one(user, { fields: [contacts.userId], references: [user.id] }),
}));

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
