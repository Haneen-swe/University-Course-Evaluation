import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createUserSchema, updateUserSchema, userQuerySchema } from './users.schema';

export const usersRouter = Router();

usersRouter.use(authenticate);

// Own profile — any authenticated user
usersRouter.get('/me', usersController.getMe);

// Admin-only routes
usersRouter.get('/', authorize('admin', 'dept_head'), validate(userQuerySchema, 'query'), usersController.list);
usersRouter.post('/', authorize('admin'), validate(createUserSchema), usersController.create);
usersRouter.get('/:id', authorize('admin'), usersController.getById);
usersRouter.put('/:id', authorize('admin'), validate(updateUserSchema), usersController.update);
usersRouter.delete('/:id', authorize('admin'), usersController.remove);
