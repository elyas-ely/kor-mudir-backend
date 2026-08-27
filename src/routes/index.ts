import { Hono } from 'hono';
import type { AppEnv } from '../types/hono';
import { analyticsRoutes } from './analytics';
import { authRoutes } from './auth';
import { contactsRoutes } from './contacts';
import { customersRoutes } from './customers';
import { propertiesRoutes } from './properties';
import { uploadsRoutes } from './uploads';
import { usersRoutes } from './users';

export const apiRoutes = new Hono<AppEnv>();

apiRoutes.route('/auth', authRoutes);
apiRoutes.route('/users', usersRoutes);
apiRoutes.route('/analytics', analyticsRoutes);
apiRoutes.route('/contacts', contactsRoutes);
apiRoutes.route('/properties', propertiesRoutes);
apiRoutes.route('/customers', customersRoutes);
apiRoutes.route('/uploads', uploadsRoutes);
