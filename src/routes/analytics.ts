import { Hono } from 'hono';
import { analyticsController } from '../controllers/analyticsController';
import { authMiddleware } from '../middlewares/authMiddleware';
import type { AppEnv } from '../types/hono';

export const analyticsRoutes = new Hono<AppEnv>();

analyticsRoutes.use('*', authMiddleware);
analyticsRoutes.get('/', analyticsController.overview);
