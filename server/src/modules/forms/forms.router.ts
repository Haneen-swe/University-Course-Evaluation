import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { prisma } from '../../config/database';
import { auditRepository } from '../audit/audit.repository';
import { AppError } from '../../shared/errors/AppError';
import { z } from 'zod';

export const formsRouter = Router();
formsRouter.use(authenticate);

const createFormSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
});

const questionSchema = z.object({
  type: z.enum(['likert', 'single_choice', 'multi_choice', 'open_text']),
  text: z.string().min(1),
  isRequired: z.boolean().default(true),
  orderIndex: z.number().int().min(1),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  scaleMin: z.number().int().optional(),
  scaleMax: z.number().int().optional(),
});

const reorderSchema = z.object({
  questions: z.array(z.object({ id: z.string().uuid(), orderIndex: z.number().int() })),
});

const formInclude = { questions: { orderBy: { orderIndex: 'asc' as const } }, creator: { select: { id: true, firstName: true, lastName: true } } };

// List all templates
formsRouter.get('/', authorize('admin', 'instructor', 'dept_head'), async (_req, res, next) => {
  try {
    const forms = await prisma.evalFormTemplate.findMany({ include: formInclude, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: forms });
  } catch (err) { next(err); }
});

// Create template
formsRouter.post('/', authorize('admin'), validate(createFormSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await prisma.evalFormTemplate.create({ data: { ...req.body, createdBy: req.user!.id }, include: formInclude });
    await auditRepository.insert({ actorId: req.user!.id, action: 'FORM_CREATED', targetType: 'EvalFormTemplate', targetId: form.id, metadata: { title: form.title } });
    res.status(201).json({ success: true, data: form });
  } catch (err) { next(err); }
});

// Get template by ID
formsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await prisma.evalFormTemplate.findUnique({ where: { id: req.params.id }, include: formInclude });
    if (!form) throw AppError.notFound('EvalFormTemplate');
    res.json({ success: true, data: form });
  } catch (err) { next(err); }
});

// Update template (draft only)
formsRouter.put('/:id', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await prisma.evalFormTemplate.findUnique({ where: { id: req.params.id } });
    if (!form) throw AppError.notFound('EvalFormTemplate');
    if (form.isPublished) throw AppError.badRequest('Cannot edit a published form. Clone it to create a new version.');
    const updated = await prisma.evalFormTemplate.update({ where: { id: req.params.id }, data: req.body, include: formInclude });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// Publish template
formsRouter.post('/:id/publish', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await prisma.evalFormTemplate.findUnique({ where: { id: req.params.id }, include: { questions: true } });
    if (!form) throw AppError.notFound('EvalFormTemplate');
    if (form.isPublished) throw AppError.conflict('Form is already published.');
    if (form.questions.length === 0) throw AppError.badRequest('Cannot publish a form with no questions.');
    const updated = await prisma.evalFormTemplate.update({ where: { id: req.params.id }, data: { isPublished: true }, include: formInclude });
    await auditRepository.insert({ actorId: req.user!.id, action: 'FORM_PUBLISHED', targetType: 'EvalFormTemplate', targetId: form.id, metadata: { title: form.title } });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// Clone template
formsRouter.post('/:id/clone', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await prisma.evalFormTemplate.findUnique({ where: { id: req.params.id }, include: { questions: true } });
    if (!form) throw AppError.notFound('EvalFormTemplate');
    const clone = await prisma.evalFormTemplate.create({
      data: {
        title: `${form.title} (Copy)`,
        description: form.description,
        version: form.version + 1,
        isPublished: false,
        createdBy: req.user!.id,
        questions: {
          create: form.questions.map(q => ({
            orderIndex: q.orderIndex,
            type: q.type,
            text: q.text,
            isRequired: q.isRequired,
            options: q.options ?? undefined,
            scaleMin: q.scaleMin,
            scaleMax: q.scaleMax,
          })),
        },
      },
      include: formInclude,
    });
    res.status(201).json({ success: true, data: clone });
  } catch (err) { next(err); }
});

// Add question
formsRouter.post('/:id/questions', authorize('admin'), validate(questionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await prisma.evalFormTemplate.findUnique({ where: { id: req.params.id } });
    if (!form) throw AppError.notFound('EvalFormTemplate');
    if (form.isPublished) throw AppError.badRequest('Cannot add questions to a published form.');
    const q = await prisma.evalQuestion.create({ data: { ...req.body, templateId: req.params.id } });
    res.status(201).json({ success: true, data: q });
  } catch (err) { next(err); }
});

// Reorder questions
formsRouter.put('/:id/questions/reorder', authorize('admin'), validate(reorderSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { questions } = req.body as { questions: { id: string; orderIndex: number }[] };
    await prisma.$transaction(questions.map(q => prisma.evalQuestion.update({ where: { id: q.id }, data: { orderIndex: q.orderIndex } })));
    res.json({ success: true, data: { message: 'Questions reordered.' } });
  } catch (err) { next(err); }
});

// Update question
formsRouter.put('/:id/questions/:qId', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await prisma.evalFormTemplate.findUnique({ where: { id: req.params.id } });
    if (!form) throw AppError.notFound('EvalFormTemplate');
    if (form.isPublished) throw AppError.badRequest('Cannot edit questions on a published form.');
    const q = await prisma.evalQuestion.update({ where: { id: req.params.qId }, data: req.body });
    res.json({ success: true, data: q });
  } catch (err) { next(err); }
});

// Delete question
formsRouter.delete('/:id/questions/:qId', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await prisma.evalFormTemplate.findUnique({ where: { id: req.params.id } });
    if (!form) throw AppError.notFound('EvalFormTemplate');
    if (form.isPublished) throw AppError.badRequest('Cannot delete questions from a published form.');
    await prisma.evalQuestion.delete({ where: { id: req.params.qId } });
    res.status(204).send();
  } catch (err) { next(err); }
});
