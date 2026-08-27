import { Hono } from 'hono';
import { uploadsController } from '../controllers/uploadsController';
import { authMiddleware } from '../middlewares/authMiddleware';
import type { AppEnv } from '../types/hono';

export const uploadsRoutes = new Hono<AppEnv>();

uploadsRoutes.use('*', authMiddleware);
uploadsRoutes.post('/presign', uploadsController.presign);
