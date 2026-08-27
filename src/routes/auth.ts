import { Hono } from 'hono';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
import type { AppEnv } from '../types/hono';

export const authRoutes = new Hono<AppEnv>();

authRoutes.post('/google', authController.googleSignIn);
authRoutes.post('/logout', authController.logout);
authRoutes.get('/me', authMiddleware, authController.me);
authRoutes.patch('/me', authMiddleware, authController.updateMe);
authRoutes.get('/subscription', authMiddleware, authController.subscriptionStatus);
