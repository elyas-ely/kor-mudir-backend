import { Hono } from 'hono';
import { customersController } from '../controllers/customersController';
import { authMiddleware } from '../middlewares/authMiddleware';
import type { AppEnv } from '../types/hono';

export const customersRoutes = new Hono<AppEnv>();

customersRoutes.use('*', authMiddleware);
customersRoutes.get('/', customersController.listCustomers);
customersRoutes.get('/:id', customersController.getCustomer);
customersRoutes.post('/', customersController.createCustomer);
customersRoutes.patch('/:id', customersController.updateCustomer);
customersRoutes.delete('/:id', customersController.deleteCustomer);
