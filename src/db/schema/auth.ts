import { relations } from 'drizzle-orm';
import { boolean, index, pgEnum, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { trialEndsAtFrom } from '../../lib/trial';
import { contacts } from './contacts';
import { properties } from './properties';

export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: userRoleEnum('role').notNull().default('user'),
  // every new user gets a 5-month free trial from the moment their account
  // is created (see lib/trial.ts); better-auth also sets this via its own
  // defaultValue (see lib/auth.ts additionalFields) — the column default here
  // is the fallback for any row inserted outside that path.
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true })
    .notNull()
    .$defaultFn(() => trialEndsAtFrom()),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // better-auth revokes sessions by user (sign-out-everywhere, admin
    // disable) and the ON DELETE cascade fires on user delete — both are
    // WHERE user_id = ?. Postgres does not auto-index FK columns; `account`
    // already has the equivalent index.
    index('session_user_id_idx').on(table.userId),
  ],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    // Identifies which issuer/provider instance the account row was linked
    // under (e.g. "https://accounts.google.com"). better-auth 1.7+ keys
    // account lookups on (issuer, accountId) rather than providerId alone.
    issuer: text('issuer').notNull(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique('account_issuer_account_id_unique').on(table.issuer, table.accountId),
    index('account_user_id_idx').on(table.userId),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  contacts: many(contacts),
  // a property always belongs to the user (agent) who created it — see
  // properties.userId / the ownership scoping in propertiesService.
  properties: many(properties),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
