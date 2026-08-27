import type { Context } from 'hono';
import { createCustomerSchema, customerListQuerySchema, updateCustomerSchema } from '../db/validation';
import { customersService } from '../services/customersService';
import type { AppEnv } from '../types/hono';
import { ApiError } from '../utils/ApiError';
import { ok } from '../utils/respond';

function parseId(idParam: string): number {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, 'Invalid customer id');
  return id;
}

export const customersController = {
  async listCustomers(c: Context<AppEnv>) {
    const currentUser = c.get('user');
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    const query = customerListQuerySchema.parse(Object.fromEntries(new URL(c.req.url).searchParams));
    const result = await customersService.getCustomers(currentUser, query);
    return ok(c, result);
  },

  async getCustomer(c: Context<AppEnv, '/:id'>) {
    const currentUser = c.get('user');
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    const id = parseId(c.req.param('id'));
    const customer = await customersService.getCustomer(currentUser, id);
    if (!customer) throw new ApiError(404, 'Customer not found');
    return ok(c, customer);
  },

  async createCustomer(c: Context<AppEnv>) {
    const currentUser = c.get('user');
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    const input = createCustomerSchema.parse(await c.req.json());
    const customer = await customersService.createCustomer(currentUser, input);
    return ok(c, customer, 201);
  },

  async updateCustomer(c: Context<AppEnv, '/:id'>) {
    const currentUser = c.get('user');
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    const id = parseId(c.req.param('id'));
    const input = updateCustomerSchema.parse(await c.req.json());
    const customer = await customersService.updateCustomer(currentUser, id, input);
    if (!customer) throw new ApiError(404, 'Customer not found');
    return ok(c, customer);
  },

  async deleteCustomer(c: Context<AppEnv, '/:id'>) {
    const currentUser = c.get('user');
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    const id = parseId(c.req.param('id'));
    const deleted = await customersService.deleteCustomer(currentUser, id);
    if (!deleted) throw new ApiError(404, 'Customer not found');
    return c.body(null, 204);
  },
};
