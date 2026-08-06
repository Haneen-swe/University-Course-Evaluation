import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { prisma } from '../../config/database';
import { auditRepository } from '../audit/audit.repository';
import { AppError } from '../../shared/errors/AppError';
import { z } from 'zod';

export const departmentsRouter = Router();
departmentsRouter.use(authenticate);

const createSchema = z.object({ name: z.string().min(1), code: z.string().min(1).max(20), headId: z.string().uuid().optional() });
const updateSchema = createSchema.partial();

departmentsRouter.get('/', async (_req, res, next) => {
  try {
    const depts = await prisma.department.findMany({ orderBy: { name: 'asc' }, include: { head: { select: { id: true, firstName: true, lastName: true } } } });
    res.json({ success: true, data: depts });
  } catch (err) { next(err); }
});

departmentsRouter.post('/', authorize('admin'), validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dept = await prisma.department.create({ data: req.body });
    await auditRepository.insert({ actorId: req.user!.id, action: 'DEPARTMENT_CREATED', targetType: 'Department', targetId: dept.id, metadata: { name: dept.name } });
    res.status(201).json({ success: true, data: dept });
  } catch (err) { next(err); }
});

departmentsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dept = await prisma.department.findUnique({ where: { id: req.params.id }, include: { head: { select: { id: true, firstName: true, lastName: true } } } });
    if (!dept) throw AppError.notFound('Department');
    res.json({ success: true, data: dept });
  } catch (err) { next(err); }
});

departmentsRouter.put('/:id', authorize('admin'), validate(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dept = await prisma.department.update({ where: { id: req.params.id }, data: req.body });
    await auditRepository.insert({ actorId: req.user!.id, action: 'DEPARTMENT_UPDATED', targetType: 'Department', targetId: dept.id, metadata: req.body });
    res.json({ success: true, data: dept });
  } catch (err) { next(err); }
});
