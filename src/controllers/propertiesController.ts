import type { Context } from 'hono';
import { createPropertySchema, propertyListQuerySchema, updatePropertySchema } from '../db/validation';
import { propertiesService } from '../services/propertiesService';
import type { AppEnv } from '../types/hono';
import { ApiError } from '../utils/ApiError';
import { ok } from '../utils/respond';

function parseId(idParam: string): number {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, 'Invalid property id');
  return id;
}

export const propertiesController = {
  async listProperties(c: Context<AppEnv>) {
    const currentUser = c.get('user');
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    const query = propertyListQuerySchema.parse(Object.fromEntries(new URL(c.req.url).searchParams));
    const result = await propertiesService.getProperties(currentUser, query);
    return ok(c, result);
  },

  async getProperty(c: Context<AppEnv, '/:id'>) {
    const currentUser = c.get('user');
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    const id = parseId(c.req.param('id'));
    const property = await propertiesService.getProperty(currentUser, id);
    if (!property) throw new ApiError(404, 'Property not found');
    return ok(c, property);
  },

  async createProperty(c: Context<AppEnv>) {
    const currentUser = c.get('user');
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    const input = createPropertySchema.parse(await c.req.json());
    const property = await propertiesService.createProperty(currentUser, input);
    return ok(c, property, 201);
  },

  async updateProperty(c: Context<AppEnv, '/:id'>) {
    const currentUser = c.get('user');
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    const id = parseId(c.req.param('id'));
    const input = updatePropertySchema.parse(await c.req.json());
    const property = await propertiesService.updateProperty(currentUser, id, input);
    if (!property) throw new ApiError(404, 'Property not found');
    return ok(c, property);
  },

  async deleteProperty(c: Context<AppEnv, '/:id'>) {
    const currentUser = c.get('user');
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    const id = parseId(c.req.param('id'));
    const deleted = await propertiesService.deleteProperty(currentUser, id);
    if (!deleted) throw new ApiError(404, 'Property not found');
    return c.body(null, 204);
  },
};
