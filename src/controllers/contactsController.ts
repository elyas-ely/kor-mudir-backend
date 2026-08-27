import type { Context } from 'hono';
import { contactListQuerySchema, createContactSchema, updateContactSchema } from '../db/validation';
import { contactsService } from '../services/contactsService';
import type { AppEnv } from '../types/hono';
import { ApiError } from '../utils/ApiError';
import { ok } from '../utils/respond';

function parseId(idParam: string): number {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, 'Invalid contact id');
  return id;
}

export const contactsController = {
  async listContacts(c: Context<AppEnv>) {
    const currentUser = c.get('user');
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    const query = contactListQuerySchema.parse(Object.fromEntries(new URL(c.req.url).searchParams));
    const result = await contactsService.getContacts(currentUser, query);
    return ok(c, result);
  },

  async getContact(c: Context<AppEnv, '/:id'>) {
    const currentUser = c.get('user');
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    const id = parseId(c.req.param('id'));
    const contact = await contactsService.getContact(currentUser, id);
    if (!contact) throw new ApiError(404, 'Contact not found');
    return ok(c, contact);
  },

  async createContact(c: Context<AppEnv>) {
    const currentUser = c.get('user');
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    const input = createContactSchema.parse(await c.req.json());
    const contact = await contactsService.createContact(currentUser, input);
    return ok(c, contact, 201);
  },

  async updateContact(c: Context<AppEnv, '/:id'>) {
    const currentUser = c.get('user');
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    const id = parseId(c.req.param('id'));
    const input = updateContactSchema.parse(await c.req.json());
    const contact = await contactsService.updateContact(currentUser, id, input);
    if (!contact) throw new ApiError(404, 'Contact not found');
    return ok(c, contact);
  },

  async deleteContact(c: Context<AppEnv, '/:id'>) {
    const currentUser = c.get('user');
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    const id = parseId(c.req.param('id'));
    const deleted = await contactsService.deleteContact(currentUser, id);
    if (!deleted) throw new ApiError(404, 'Contact not found');
    return c.body(null, 204);
  },
};
