import { relations } from 'drizzle-orm';
import {
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

export const propertyTypeEnum = pgEnum('property_type', [
  'house',
  'apartment',
  'villa',
  'land',
  'garden',
  'shop',
  'office',
  'warehouse',
  'building',
]);

export const propertyPurposeEnum = pgEnum('property_purpose', ['sale', 'rent', 'mortgage']);

export const propertyCurrencyEnum = pgEnum('property_currency', ['afghani', 'usd', 'rupee']);

export const propertySizeUnitEnum = pgEnum('property_size_unit', ['sqm', 'sqft']);

export const properties = pgTable(
  'properties',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // owner contact details, stored directly on the listing (no separate
    // contacts row). name is always collected; phone/whatsapp are optional
    // but the create form requires at least one of them.
    ownerName: text('owner_name').notNull(),
    ownerPhoneCountryIso: text('owner_phone_country_iso'),
    ownerPhone: text('owner_phone'),
    ownerWhatsappCountryIso: text('owner_whatsapp_country_iso'),
    ownerWhatsapp: text('owner_whatsapp'),
    // not collected by the current create form — null until set.
    code: text('code'),
    propertyType: propertyTypeEnum('property_type').notNull(),
    purpose: propertyPurposeEnum('purpose').notNull(),
    price: doublePrecision('price').notNull(),
    currency: propertyCurrencyEnum('currency').notNull().default('afghani'),
    // not collected by the current create form (location is lat/long only) —
    // null until set.
    address: text('address'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    bedrooms: integer('bedrooms'),
    bathrooms: integer('bathrooms'),
    floors: integer('floors'),
    kitchens: integer('kitchens'),
    buildingSize: doublePrecision('building_size'),
    buildingSizeUnit: propertySizeUnitEnum('building_size_unit'),
    landSize: doublePrecision('land_size'),
    landSizeUnit: propertySizeUnitEnum('land_size_unit'),
    yearBuilt: integer('year_built'),
    // R2 object key for the listing's single photo; null = no image.
    imageKey: text('image_key'),
    description: text('description').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // The list query is: WHERE user_id = ? [AND optional filters] [AND id < :cursor]
    // ORDER BY id DESC LIMIT n  (keyset pagination — see propertiesService).
    // (user_id, id) serves the equality, the cursor range, and the ordering
    // (backward index scan, no sort). Leading user_id also covers the
    // ownership checks on get/update/delete and the ON DELETE cascade.
    index('properties_user_id_id_idx').on(table.userId, table.id),
  ],
);

export const propertiesRelations = relations(properties, ({ one }) => ({
  user: one(user, { fields: [properties.userId], references: [user.id] }),
}));

export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;
