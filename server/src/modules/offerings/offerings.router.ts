import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { prisma } from '../../config/database';
import { auditRepository } from '../audit/audit.repository';
import { AppError } from '../../shared/errors/AppError';
import { z } from 'zod';

export const offeringsRouter = Router();
offeringsRouter.use(authenticate);

const createSchema = z.object({
  courseId: z.string().uuid(),
  termId: z.string().uuid(),
  instructorId: z.string().uuid(),
  section: z.string().default('A'),
  evalFormId: z.string().uuid().optional(),
  minResponsesThreshold: z.number().int().min(1).default(5),
});

const windowSchema = z.object({
  evalWindowOpen: z.string().transform(v => new Date(v)),
  evalWindowClose: z.string().transform(v => new Date(v)),
});

const offeringInclude = {
  course: { select: { id: true, code: true, title: true, credits: true } },
  term: { select: { id: true, name: true } },
  instructor: { select: { id: true, firstName: true, lastName: true, email: true } },
  evalForm: { select: { id: true, title: true, version: true } },
};

offeringsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { termId, instructorId, departmentId } = req.query as Record<string, string>;
    const offerings = await prisma.courseOffering.findMany({
      where: {
        ...(termId && { termId }),
        ...(instructorId && { instructorId }),
        ...(departmentId && { course: { departmentId } }),
      },
      include: offeringInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: offerings });
  } catch (err) { next(err); }
});

offeringsRouter.post('/', authorize('admin'), validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offering = await prisma.courseOffering.create({ data: req.body, include: offeringInclude });
    await auditRepository.insert({ actorId: req.user!.id, action: 'OFFERING_CREATED', targetType: 'CourseOffering', targetId: offering.id, metadata: req.body });
    res.status(201).json({ success: true, data: offering });
  } catch (err) { next(err); }
});

offeringsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offering = await prisma.courseOffering.findUnique({ where: { id: req.params.id }, include: offeringInclude });
    if (!offering) throw AppError.notFound('CourseOffering');
    res.json({ success: true, data: offering });
  } catch (err) { next(err); }
});

offeringsRouter.put('/:id', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offering = await prisma.courseOffering.update({ where: { id: req.params.id }, data: req.body, include: offeringInclude });
    await auditRepository.insert({ actorId: req.user!.id, action: 'OFFERING_UPDATED', targetType: 'CourseOffering', targetId: offering.id, metadata: req.body });
    res.json({ success: true, data: offering });
  } catch (err) { next(err); }
});

// Set evaluation window
offeringsRouter.put('/:id/window', authorize('admin'), validate(windowSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { evalWindowOpen, evalWindowClose } = req.body as { evalWindowOpen: Date; evalWindowClose: Date };
    if (evalWindowOpen >= evalWindowClose) throw AppError.badRequest('Open date must be before close date.');
    const offering = await prisma.courseOffering.update({
      where: { id: req.params.id },
      data: { evalWindowOpen, evalWindowClose },
      include: offeringInclude,
    });
    await auditRepository.insert({ actorId: req.user!.id, action: 'EVAL_WINDOW_SET', targetType: 'CourseOffering', targetId: offering.id, metadata: { evalWindowOpen, evalWindowClose } });
    res.json({ success: true, data: offering });
  } catch (err) { next(err); }
});

// Release / restrict results
offeringsRouter.put('/:id/release', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { resultsReleased } = req.body as { resultsReleased: boolean };
    const offering = await prisma.courseOffering.findUnique({ where: { id: req.params.id } });
    if (!offering) throw AppError.notFound('CourseOffering');

    if (resultsReleased) {
      const count = await prisma.response.count({ where: { offeringId: req.params.id } });
      if (count < offering.minResponsesThreshold) {
        throw AppError.unprocessable(
          `Cannot release: only ${count} response(s) received. Minimum required: ${offering.minResponsesThreshold}.`,
          { responseCount: count, threshold: offering.minResponsesThreshold }
        );
      }
    }

    const updated = await prisma.courseOffering.update({ where: { id: req.params.id }, data: { resultsReleased }, include: offeringInclude });
    await auditRepository.insert({ actorId: req.user!.id, action: resultsReleased ? 'RESULTS_RELEASED' : 'RESULTS_RESTRICTED', targetType: 'CourseOffering', targetId: req.params.id, metadata: { resultsReleased } });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});
