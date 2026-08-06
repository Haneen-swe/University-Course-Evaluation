import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

export const evaluationsRouter = Router();
evaluationsRouter.use(authenticate);

const submitLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many submission attempts.', details: null } },
});

const answerSchema = z.object({
  questionId: z.string().uuid(),
  value: z.string().min(1, 'Answer cannot be empty'),
});

const submitSchema = z.object({
  answers: z.array(answerSchema).min(1, 'At least one answer is required'),
});

// GET /evaluations/pending — student sees open evaluations for their enrolled courses
evaluationsRouter.get('/pending', authorize('student'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: req.user!.id },
      include: {
        offering: {
          include: {
            course: { select: { code: true, title: true } },
            term: { select: { name: true } },
            instructor: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const pending = await Promise.all(
      enrollments
        .filter(e => {
          const o = e.offering;
          return o.evalWindowOpen && o.evalWindowClose &&
            now >= o.evalWindowOpen && now <= o.evalWindowClose;
        })
        .map(async (e) => {
          const token = await prisma.participationToken.findFirst({
            where: { studentId: req.user!.id, offeringId: e.offeringId },
          });
          return { ...e.offering, submitted: token?.submitted ?? false };
        })
    );

    res.json({ success: true, data: pending });
  } catch (err) { next(err); }
});

// GET /evaluations/:offeringId/form — get the evaluation form for an offering
evaluationsRouter.get('/:offeringId/form', authorize('student'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enrollment = await prisma.enrollment.findFirst({ where: { studentId: req.user!.id, offeringId: req.params.offeringId } });
    if (!enrollment) throw AppError.forbidden('You are not enrolled in this course offering.');

    const offering = await prisma.courseOffering.findUnique({
      where: { id: req.params.offeringId },
      include: { evalForm: { include: { questions: { orderBy: { orderIndex: 'asc' } } } } },
    });
    if (!offering) throw AppError.notFound('CourseOffering');
    if (!offering.evalForm) throw AppError.notFound('Evaluation form not yet assigned to this offering.');

    const now = new Date();
    if (!offering.evalWindowOpen || !offering.evalWindowClose || now < offering.evalWindowOpen || now > offering.evalWindowClose) {
      throw AppError.forbidden('The evaluation window for this course is not currently open.');
    }

    res.json({ success: true, data: offering.evalForm });
  } catch (err) { next(err); }
});

// GET /evaluations/:offeringId/status — check own submission status
evaluationsRouter.get('/:offeringId/status', authorize('student'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = await prisma.participationToken.findFirst({ where: { studentId: req.user!.id, offeringId: req.params.offeringId } });
    res.json({ success: true, data: { submitted: token?.submitted ?? false, submittedAt: token?.submittedAt ?? null } });
  } catch (err) { next(err); }
});

// POST /evaluations/:offeringId/submit — ANONYMOUS submission (critical privacy flow)
evaluationsRouter.post('/:offeringId/submit', authorize('student'), submitLimiter, validate(submitSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;
    const offeringId = req.params.offeringId;
    const { answers } = req.body as { answers: { questionId: string; value: string }[] };

    // 1. Verify enrollment
    const enrollment = await prisma.enrollment.findFirst({ where: { studentId, offeringId } });
    if (!enrollment) throw AppError.forbidden('You are not enrolled in this course offering.');

    // 2. Verify evaluation window
    const offering = await prisma.courseOffering.findUnique({ where: { id: offeringId } });
    if (!offering) throw AppError.notFound('CourseOffering');
    const now = new Date();
    if (!offering.evalWindowOpen || !offering.evalWindowClose || now < offering.evalWindowOpen || now > offering.evalWindowClose) {
      throw AppError.forbidden('The evaluation window is not currently open.');
    }

    // 3. Verify not already submitted
    const existing = await prisma.participationToken.findFirst({ where: { studentId, offeringId } });
    if (existing?.submitted) throw AppError.conflict('You have already submitted an evaluation for this course.');

    // 4. Validate all required questions are answered
    const form = await prisma.evalFormTemplate.findUnique({
      where: { id: offering.evalFormId! },
      include: { questions: true },
    });
    if (!form) throw AppError.notFound('Evaluation form');
    const requiredIds = form.questions.filter(q => q.isRequired).map(q => q.id);
    const answeredIds = answers.map(a => a.questionId);
    const missing = requiredIds.filter(id => !answeredIds.includes(id));
    if (missing.length > 0) {
      throw AppError.unprocessable('All required questions must be answered.', { missingQuestions: missing });
    }

    // 5. ATOMIC TRANSACTION — privacy-critical
    // responses table has NO student_id column (enforced at schema level)
    await prisma.$transaction([
      prisma.response.createMany({
        data: answers.map(a => ({
          offeringId,    // links to course — NOT to student
          questionId: a.questionId,
          value: a.value,
        })),
      }),
      prisma.participationToken.upsert({
        where: { studentId_offeringId: { studentId, offeringId } },
        update: { submitted: true, submittedAt: now },
        create: { studentId, offeringId, submitted: true, submittedAt: now },
      }),
    ]);

    res.status(201).json({
      success: true,
      data: { message: 'Evaluation submitted successfully. Thank you for your feedback.' },
    });
  } catch (err) { next(err); }
});
