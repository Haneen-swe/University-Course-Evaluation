import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { prisma } from '../../config/database';
import { auditRepository } from '../audit/audit.repository';
import { AppError } from '../../shared/errors/AppError';
import { z } from 'zod';

export const termsRouter = Router();
termsRouter.use(authenticate);

const createSchema = z.object({
  name: z.string().min(1).max(100),
  startDate: z.string().transform(v => new Date(v)),
  endDate: z.string().transform(v => new Date(v)),
  isActive: z.boolean().default(false),
});
const updateSchema = createSchema.partial();

termsRouter.get('/', async (_req, res, next) => {
  try {
    const terms = await prisma.term.findMany({ orderBy: { startDate: 'desc' } });
    res.json({ success: true, data: terms });
  } catch (err) { next(err); }
});

termsRouter.post('/', authorize('admin'), validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const term = await prisma.term.create({ data: req.body });
    await auditRepository.insert({ actorId: req.user!.id, action: 'TERM_CREATED', targetType: 'Term', targetId: term.id, metadata: { name: term.name } });
    res.status(201).json({ success: true, data: term });
  } catch (err) { next(err); }
});

termsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const term = await prisma.term.findUnique({ where: { id: req.params.id } });
    if (!term) throw AppError.notFound('Term');
    res.json({ success: true, data: term });
  } catch (err) { next(err); }
});

termsRouter.put('/:id', authorize('admin'), validate(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const term = await prisma.term.update({ where: { id: req.params.id }, data: req.body });
    await auditRepository.insert({ actorId: req.user!.id, action: 'TERM_UPDATED', targetType: 'Term', targetId: term.id, metadata: req.body });
    res.json({ success: true, data: term });
  } catch (err) { next(err); }
});

termsRouter.delete('/:id', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.term.delete({ where: { id: req.params.id } });
    await auditRepository.insert({ actorId: req.user!.id, action: 'TERM_DELETED', targetType: 'Term', targetId: req.params.id, metadata: {} });
    res.status(204).send();
  } catch (err) { next(err); }
});
