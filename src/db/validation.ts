import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { contactKindEnum, contacts, workerRoleEnum } from './schema/contacts';
import { customers } from './schema/customers';
import {
  properties,
  propertyCurrencyEnum,
  propertyPurposeEnum,
  propertySizeUnitEnum,
  propertyTypeEnum,
} from './schema/properties';

export const googleAuthSchema = z.object({
  idToken: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'name is required').optional(),
  agency: z.string().trim().optional(),
});

// properties are the only resource with images today — the R2 key is always
// prefixed "properties/", see uploadsService.presignPut.
export const presignUploadSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

const isValidLatitude = (v: number) => v >= -90 && v <= 90;
const isValidLongitude = (v: number) => v >= -180 && v <= 180;
// null/undefined pass — a client may clear the image by sending imageKey: null.
const isValidPropertyImageKey = (v: string | null | undefined) =>
  v == null || v.startsWith('properties/');

const contactBaseInsertSchema = createInsertSchema(contacts, {
  name: (schema) => schema.trim().min(1, 'name is required'),
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true });

// role/note only make sense for kind = 'worker' — reject them on owner/friend contacts
// rather than silently ignoring them, so a client bug surfaces immediately.
const workerOnlyFieldsAreConsistent = (data: { kind?: string; role?: unknown; note?: unknown }) =>
  data.kind === 'worker' || data.kind === undefined || (data.role == null && data.note == null);
const workerOnlyFieldsIssue = {
  message: 'role/note only apply to worker contacts',
  path: ['role'],
};

export const createContactSchema = contactBaseInsertSchema.refine(
  workerOnlyFieldsAreConsistent,
  workerOnlyFieldsIssue,
);
export const updateContactSchema = contactBaseInsertSchema
  .partial()
  .refine(workerOnlyFieldsAreConsistent, workerOnlyFieldsIssue);

export const contactListQuerySchema = z.object({
  search: z.string().optional(),
  kind: z.enum(contactKindEnum.enumValues).optional(),
  // only meaningful with kind = 'worker' — filters the worker directory
  // down to a single trade.
  role: z.enum(workerRoleEnum.enumValues).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});

const propertyBaseInsertSchema = createInsertSchema(properties, {
  // both nullable — the create form doesn't collect either yet.
  // Trimmed when a client does send a value.
  code: (schema) => schema.trim(),
  address: (schema) => schema.trim(),
  price: (schema) => schema.nonnegative('price must be >= 0'),
  latitude: (schema) => schema.refine(isValidLatitude, 'latitude must be between -90 and 90'),
  longitude: (schema) => schema.refine(isValidLongitude, 'longitude must be between -180 and 180'),
  imageKey: (schema) =>
    schema.refine(isValidPropertyImageKey, 'imageKey must start with "properties/"'),
  ownerName: (schema) => schema.trim().min(1, 'owner name is required'),
  ownerPhone: (schema) => schema.trim(),
  ownerWhatsapp: (schema) => schema.trim(),
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true });

// create requires at least one way to contact the owner; update is partial so
// it only checks when a client actually touches an owner-contact field.
const ownerHasContactMethod = (data: { ownerPhone?: unknown; ownerWhatsapp?: unknown }) =>
  data.ownerPhone != null || data.ownerWhatsapp != null;
const ownerContactIssue = {
  message: 'owner phone or whatsapp is required',
  path: ['ownerPhone'],
};

export const createPropertySchema = propertyBaseInsertSchema.refine(
  ownerHasContactMethod,
  ownerContactIssue,
);
export const updatePropertySchema = propertyBaseInsertSchema.partial();

export const propertyListQuerySchema = z.object({
  search: z.string().optional(),
  propertyType: z.enum(propertyTypeEnum.enumValues).optional(),
  purpose: z.enum(propertyPurposeEnum.enumValues).optional(),
  currency: z.enum(propertyCurrencyEnum.enumValues).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  bedroomsMin: z.coerce.number().int().nonnegative().optional(),
  bathroomsMin: z.coerce.number().int().nonnegative().optional(),
  buildingSizeUnit: z.enum(propertySizeUnitEnum.enumValues).optional(),
  minBuildingSize: z.coerce.number().nonnegative().optional(),
  maxBuildingSize: z.coerce.number().nonnegative().optional(),
  landSizeUnit: z.enum(propertySizeUnitEnum.enumValues).optional(),
  minLandSize: z.coerce.number().nonnegative().optional(),
  maxLandSize: z.coerce.number().nonnegative().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});

const customerBaseInsertSchema = createInsertSchema(customers, {
  name: (schema) => schema.trim().min(1, 'name is required'),
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true });

export const createCustomerSchema = customerBaseInsertSchema;
export const updateCustomerSchema = customerBaseInsertSchema.partial();

export const customerListQuerySchema = z.object({
  search: z.string().optional(),
  interestedPropertyType: z.enum(propertyTypeEnum.enumValues).optional(),
  interestedPurpose: z.enum(propertyPurposeEnum.enumValues).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});
