import { relations } from 'drizzle-orm';
import { index, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { propertyPurposeEnum, propertyTypeEnum } from './properties';

export const customers = pgTable(
  'customers',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    requirement: text('requirement').notNull().default(''),
    interestedPropertyType: propertyTypeEnum('interested_property_type'),
    interestedPurpose: propertyPurposeEnum('interested_purpose'),
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
    // The list query is: WHERE user_id = ? [AND interested type/purpose]
    // [AND id < :cursor] ORDER BY id DESC LIMIT n  (keyset pagination — see
    // customersService). (user_id, id) serves the equality, the cursor range,
    // and the ordering with no sort. Leading user_id also covers the ownership
    // checks on get/update/delete and the ON DELETE cascade.
    index('customers_user_id_id_idx').on(table.userId, table.id),
  ],
);

export const customersRelations = relations(customers, ({ one }) => ({
  user: one(user, { fields: [customers.userId], references: [user.id] }),
}));

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
