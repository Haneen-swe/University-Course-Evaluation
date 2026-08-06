import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { z } from 'zod';

export const enrollmentsRouter = Router();
enrollmentsRouter.use(authenticate);

const enrollSchema = z.object({ studentId: z.string().uuid() });

// List students in an offering
enrollmentsRouter.get('/offerings/:id/students', authorize('admin', 'dept_head', 'instructor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { offeringId: req.params.id },
      include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    res.json({ success: true, data: enrollments });
  } catch (err) { next(err); }
});

// Enroll a student
enrollmentsRouter.post('/offerings/:id/students', authorize('admin'), validate(enrollSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offering = await prisma.courseOffering.findUnique({ where: { id: req.params.id } });
    if (!offering) throw AppError.notFound('CourseOffering');
    const student = await prisma.user.findFirst({ where: { id: req.body.studentId, role: 'student', deletedAt: null } });
    if (!student) throw AppError.notFound('Student');
    const enrollment = await prisma.enrollment.create({
      data: { studentId: req.body.studentId, offeringId: req.params.id },
      include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    res.status(201).json({ success: true, data: enrollment });
  } catch (err) { next(err); }
});

// Remove enrollment
enrollmentsRouter.delete('/offerings/:id/students/:studentId', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.enrollment.deleteMany({ where: { offeringId: req.params.id, studentId: req.params.studentId } });
    res.status(204).send();
  } catch (err) { next(err); }
});
