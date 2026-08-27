import { Hono } from 'hono';
import { contactsController } from '../controllers/contactsController';
import { authMiddleware } from '../middlewares/authMiddleware';
import type { AppEnv } from '../types/hono';

export const contactsRoutes = new Hono<AppEnv>();

contactsRoutes.use('*', authMiddleware);
contactsRoutes.get('/', contactsController.listContacts);
contactsRoutes.get('/:id', contactsController.getContact);
contactsRoutes.post('/', contactsController.createContact);
contactsRoutes.patch('/:id', contactsController.updateContact);
contactsRoutes.delete('/:id', contactsController.deleteContact);
