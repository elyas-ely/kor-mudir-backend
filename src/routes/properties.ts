import { Hono } from 'hono';
import { propertiesController } from '../controllers/propertiesController';
import { authMiddleware } from '../middlewares/authMiddleware';
import type { AppEnv } from '../types/hono';

export const propertiesRoutes = new Hono<AppEnv>();

propertiesRoutes.use('*', authMiddleware);
propertiesRoutes.get('/', propertiesController.listProperties);
propertiesRoutes.get('/:id', propertiesController.getProperty);
propertiesRoutes.post('/', propertiesController.createProperty);
propertiesRoutes.patch('/:id', propertiesController.updateProperty);
propertiesRoutes.delete('/:id', propertiesController.deleteProperty);
