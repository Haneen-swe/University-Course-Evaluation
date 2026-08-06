import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { auditRepository } from './audit.repository';
import { parsePagination } from '../../shared/utils/pagination';

export const auditRouter = Router();
auditRouter.use(authenticate, authorize('admin'));

auditRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { skip, take, page, limit } = parsePagination(req.query);
    const { actorId, action, targetType, from, to } = req.query as Record<string, string>;
    const [logs, total] = await auditRepository.findMany({
      actorId,
      action,
      targetType,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      skip,
      take,
    });
    res.json({
      success: true,
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
});
