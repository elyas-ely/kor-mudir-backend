import { Hono } from 'hono';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
import type { AppEnv } from '../types/hono';

export const usersRoutes = new Hono<AppEnv>();

usersRoutes.use('*', authMiddleware);
usersRoutes.get('/', authController.listUsers);
usersRoutes.delete('/:id', authController.deleteUser);
