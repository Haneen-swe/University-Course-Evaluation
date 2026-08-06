import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { prisma } from '../../config/database';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

// GET own notifications
notificationsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: notifications });
  } catch (err) { next(err); }
});

// Mark as read (update status to 'sent' treated as acknowledged)
notificationsRouter.put('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { status: 'sent' },
    });
    res.json({ success: true, data: { message: 'Notification marked as read.' } });
  } catch (err) { next(err); }
});

// Admin: trigger manual notification
notificationsRouter.post('/send', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, type, channel, payload } = req.body;
    const notification = await prisma.notification.create({
      data: { userId, type, channel, status: 'pending', payload },
    });
    res.status(201).json({ success: true, data: notification });
  } catch (err) { next(err); }
});
