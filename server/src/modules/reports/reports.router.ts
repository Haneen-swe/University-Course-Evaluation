
import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
export const reportsRouter = Router();
reportsRouter.use(authenticate);

// Helper: compute stats for a set of numeric values
function computeStats(values: number[]) {
  if (values.length === 0) return { mean: null, median: null, stdDev: null };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return { mean: +mean.toFixed(2), median: +median.toFixed(2), stdDev: +stdDev.toFixed(2) };
}

// GET /reports/offerings/:id
reportsRouter.get('/offerings/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offering = await prisma.courseOffering.findUnique({
      where: { id: req.params.id },
      include: {
        course: { select: { code: true, title: true } },
        term: { select: { name: true } },
        instructor: { select: { id: true, firstName: true, lastName: true } },
        evalForm: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
      },
    });
    if (!offering) throw AppError.notFound('CourseOffering');

    const user = req.user!;
    // Instructors can only see own offering's report, and only after release
    if (user.role === 'instructor') {
      if (offering.instructorId !== user.id) throw AppError.forbidden();
      if (!offering.resultsReleased) throw AppError.forbidden('Results have not been released for this offering yet.');
    }
    // Dept heads can see their department's reports
    if (user.role === 'dept_head') {
      const course = await prisma.course.findUnique({ where: { id: offering.courseId } });
      if (course?.departmentId !== user.departmentId) throw AppError.forbidden();
    }

    const totalEnrolled = await prisma.enrollment.count({ where: { offeringId: req.params.id } });
    const submittedCount = await prisma.participationToken.count({ where: { offeringId: req.params.id, submitted: true } });

    // Check threshold for instructors
    if (user.role === 'instructor' && submittedCount < offering.minResponsesThreshold) {
      throw AppError.forbidden(
        `Results require at least ${offering.minResponsesThreshold} responses. Current: ${submittedCount}`
      );
    }

    const responses = await prisma.response.findMany({ where: { offeringId: req.params.id } });

    // Aggregate per question
    const questions = offering.evalForm?.questions ?? [];
    const questionReports = questions.map(q => {
      const qResponses = responses.filter((r) => r.questionId === q.id);
      const base = { questionId: q.id, text: q.text, type: q.type, responseCount: qResponses.length };

      if (q.type ==='likert') {
        const values = qResponses.map((r) => parseFloat(r.value)).filter(v => !isNaN(v));
        const distribution: Record<string, number> = {};
        values.forEach(v => { distribution[String(v)] = (distribution[String(v)] ?? 0) + 1; });
        return { ...base, stats: computeStats(values), distribution };
      }

      if (q.type === 'single_choice' || q.type === 'multi_choice') {
        const distribution: Record<string, number> = {};
        qResponses.forEach((r) => {
          let vals: string[];
          if (q.type === 'multi_choice') {
            // Values are stored as a JSON array (e.g. '["a","b"]').
            // Fall back to comma-split for any legacy data stored as plain CSV.
            try { vals = JSON.parse(r.value); } catch { vals = r.value.split(','); }
          } else {
            vals = [r.value];
          }
          vals.forEach(v => { distribution[v.trim()] = (distribution[v.trim()] ?? 0) + 1; });
        });
        return { ...base, distribution };
      }

      // open_text — return responses (anonymised — no student info)
      return { ...base, responses: qResponses.map(r => r.value) };
    });

    res.json({
      success: true,
      data: {
        offeringId: offering.id,
        courseName: offering.course.title,
        courseCode: offering.course.code,
        term: offering.term.name,
        instructor: `${offering.instructor.firstName} ${offering.instructor.lastName}`,
        responseCount: submittedCount,
        enrollmentCount: totalEnrolled,
        responseRate: totalEnrolled > 0 ? +(submittedCount / totalEnrolled).toFixed(2) : 0,
        resultsReleased: offering.resultsReleased,
        questions: questionReports,
      },
    });
  } catch (err) { next(err); }
});

// GET /reports/institution — admin only
reportsRouter.get('/institution', authorize('admin'), async (_req, res, next) => {
  try {
    const [totalUsers, totalCourses, totalOfferings, totalResponses, totalSubmissions] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.course.count({ where: { isArchived: false } }),
      prisma.courseOffering.count(),
      prisma.response.count(),
      prisma.participationToken.count({ where: { submitted: true } }),
    ]);
    const terms = await prisma.term.findMany({ orderBy: { startDate: 'desc' }, take: 5 });
    res.json({ success: true, data: { totalUsers, totalCourses, totalOfferings, totalResponses, totalSubmissions, recentTerms: terms } });
  } catch (err) { next(err); }
});

// GET /reports/instructors/:id — dept head or admin
reportsRouter.get('/instructors/:id', authorize('admin', 'dept_head', 'instructor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    if (user.role === 'instructor' && user.id !== req.params.id) throw AppError.forbidden();
    const offerings = await prisma.courseOffering.findMany({
      where: { instructorId: req.params.id, resultsReleased: true },
      include: { course: { select: { code: true, title: true } }, term: { select: { name: true } } },
    });
    const summary = await Promise.all(
      offerings.map(async (o) => {
        const submissions = await prisma.participationToken.count({
          where: {
            offeringId: o.id,
            submitted: true,
          },
        });

        const enrolled = await prisma.enrollment.count({
          where: {
            offeringId: o.id,
          },
        });

        return {
          offeringId: o.id,
          course: o.course,
          term: o.term,
          submissions,
          enrolled,
          responseRate:
            enrolled > 0 ? +(submissions / enrolled).toFixed(2) : 0,
        };
      })
    );

    res.json({
      success: true,
      data: {
        instructorId: req.params.id,
        offerings: summary,
      },
    });
  } catch (err) { next(err); }
});