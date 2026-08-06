import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { prisma } from '../../config/database';
import { auditRepository } from '../audit/audit.repository';
import { AppError } from '../../shared/errors/AppError';
import { z } from 'zod';

export const coursesRouter = Router();
coursesRouter.use(authenticate);

const createSchema = z.object({
  code: z.string().min(1).max(20),
  title: z.string().min(1).max(255),
  credits: z.number().int().min(1).max(6),
  departmentId: z.string().uuid(),
});
const updateSchema = createSchema.partial().extend({ isArchived: z.boolean().optional() });

const courseInclude = { department: { select: { id: true, name: true, code: true } } };

coursesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { departmentId, search } = req.query as { departmentId?: string; search?: string };
    const courses = await prisma.course.findMany({
      where: {
        ...(departmentId && { departmentId }),
        ...(search && { OR: [{ code: { contains: search, mode: 'insensitive' } }, { title: { contains: search, mode: 'insensitive' } }] }),
        isArchived: false,
      },
      include: courseInclude,
      orderBy: { code: 'asc' },
    });
    res.json({ success: true, data: courses });
  } catch (err) { next(err); }
});

coursesRouter.post('/', authorize('admin'), validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await prisma.course.create({ data: req.body, include: courseInclude });
    await auditRepository.insert({ actorId: req.user!.id, action: 'COURSE_CREATED', targetType: 'Course', targetId: course.id, metadata: { code: course.code, title: course.title } });
    res.status(201).json({ success: true, data: course });
  } catch (err) { next(err); }
});

coursesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.id }, include: courseInclude });
    if (!course) throw AppError.notFound('Course');
    res.json({ success: true, data: course });
  } catch (err) { next(err); }
});

coursesRouter.put('/:id', authorize('admin'), validate(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await prisma.course.update({ where: { id: req.params.id }, data: req.body, include: courseInclude });
    await auditRepository.insert({ actorId: req.user!.id, action: 'COURSE_UPDATED', targetType: 'Course', targetId: course.id, metadata: req.body });
    res.json({ success: true, data: course });
  } catch (err) { next(err); }
});
