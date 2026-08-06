import { PrismaClient, Role, QuestionType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
  console.log('🌱  Seeding database...');

  const hash = await bcrypt.hash('Admin1234!', SALT_ROUNDS);

  // ── Departments ──────────────────────────────────────────────
  const csDept = await prisma.department.upsert({
    where: { code: 'CS' },
    update: {},
    create: { name: 'Computer Science', code: 'CS' },
  });

  const engDept = await prisma.department.upsert({
    where: { code: 'ENG' },
    update: {},
    create: { name: 'Engineering', code: 'ENG' },
  });

  // ── Users ─────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@uni.edu' },
    update: {},
    create: {
      email: 'admin@uni.edu',
      passwordHash: hash,
      firstName: 'System',
      lastName: 'Administrator',
      role: Role.admin,
      isActive: true,
    },
  });

  const deptHead = await prisma.user.upsert({
    where: { email: 'depthead@uni.edu' },
    update: {},
    create: {
      email: 'depthead@uni.edu',
      passwordHash: hash,
      firstName: 'Dr. Sarah',
      lastName: 'Johnson',
      role: Role.dept_head,
      departmentId: csDept.id,
      isActive: true,
    },
  });

  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@uni.edu' },
    update: {},
    create: {
      email: 'instructor@uni.edu',
      passwordHash: hash,
      firstName: 'Prof. Michael',
      lastName: 'Chen',
      role: Role.instructor,
      departmentId: csDept.id,
      isActive: true,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@uni.edu' },
    update: {},
    create: {
      email: 'student@uni.edu',
      passwordHash: hash,
      firstName: 'Alice',
      lastName: 'Williams',
      role: Role.student,
      departmentId: csDept.id,
      isActive: true,
    },
  });

  // Update dept head
  await prisma.department.update({
    where: { id: csDept.id },
    data: { headId: deptHead.id },
  });

  // ── Term ──────────────────────────────────────────────────────
  const term = await prisma.term.upsert({
    where: { id: 'aaaaaaaa-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'aaaaaaaa-0000-0000-0000-000000000001',
      name: 'Fall 2024',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-01-15'),
      isActive: true,
    },
  });

  // ── Courses ───────────────────────────────────────────────────
  const seCourse = await prisma.course.upsert({
    where: { code_departmentId: { code: 'CS401', departmentId: csDept.id } },
    update: {},
    create: {
      code: 'CS401',
      title: 'Software Engineering',
      credits: 3,
      departmentId: csDept.id,
    },
  });

  const dbCourse = await prisma.course.upsert({
    where: { code_departmentId: { code: 'CS301', departmentId: csDept.id } },
    update: {},
    create: {
      code: 'CS301',
      title: 'Database Systems',
      credits: 3,
      departmentId: csDept.id,
    },
  });

  // ── Evaluation Form Template ───────────────────────────────────
  const existing = await prisma.evalFormTemplate.findFirst({
    where: { title: 'Standard Course Evaluation Form v1' },
  });

  let formTemplate = existing;
  if (!formTemplate) {
    formTemplate = await prisma.evalFormTemplate.create({
      data: {
        title: 'Standard Course Evaluation Form v1',
        description: 'Default evaluation form used across all undergraduate courses.',
        version: 1,
        isPublished: true,
        createdBy: admin.id,
        questions: {
          create: [
            {
              orderIndex: 1,
              type: QuestionType.likert,
              text: 'The instructor explained concepts clearly and effectively.',
              isRequired: true,
              scaleMin: 1,
              scaleMax: 5,
            },
            {
              orderIndex: 2,
              type: QuestionType.likert,
              text: 'The course materials (slides, readings, labs) were helpful.',
              isRequired: true,
              scaleMin: 1,
              scaleMax: 5,
            },
            {
              orderIndex: 3,
              type: QuestionType.likert,
              text: 'The workload for this course was appropriate for its credit hours.',
              isRequired: true,
              scaleMin: 1,
              scaleMax: 5,
            },
            {
              orderIndex: 4,
              type: QuestionType.likert,
              text: 'Feedback on assessments was timely and constructive.',
              isRequired: true,
              scaleMin: 1,
              scaleMax: 5,
            },
            {
              orderIndex: 5,
              type: QuestionType.single_choice,
              text: 'Overall, how would you rate this course?',
              isRequired: true,
              options: [
                { value: 'excellent', label: 'Excellent' },
                { value: 'good', label: 'Good' },
                { value: 'average', label: 'Average' },
                { value: 'below_average', label: 'Below Average' },
                { value: 'poor', label: 'Poor' },
              ],
            },
            {
              orderIndex: 6,
              type: QuestionType.multi_choice,
              text: 'Which aspects of this course were most valuable? (Select all that apply)',
              isRequired: false,
              options: [
                { value: 'lectures', label: 'Lectures' },
                { value: 'lab_work', label: 'Lab / Practical work' },
                { value: 'group_projects', label: 'Group projects' },
                { value: 'reading_materials', label: 'Reading materials' },
                { value: 'instructor_interaction', label: 'Instructor interaction' },
              ],
            },
            {
              orderIndex: 7,
              type: QuestionType.open_text,
              text: 'What did you find most valuable about this course?',
              isRequired: false,
            },
            {
              orderIndex: 8,
              type: QuestionType.open_text,
              text: 'What suggestions do you have to improve this course?',
              isRequired: false,
            },
          ],
        },
      },
    });
  }

  // ── Course Offerings ──────────────────────────────────────────
  const seOffering = await prisma.courseOffering.upsert({
    where: {
      courseId_termId_section: {
        courseId: seCourse.id,
        termId: term.id,
        section: 'A',
      },
    },
    update: {},
    create: {
      courseId: seCourse.id,
      termId: term.id,
      instructorId: instructor.id,
      section: 'A',
      evalFormId: formTemplate.id,
      evalWindowOpen: new Date('2024-12-01T00:00:00Z'),
      evalWindowClose: new Date('2025-12-31T23:59:59Z'),
      minResponsesThreshold: 3,
      resultsReleased: false,
    },
  });

  // ── Enrollments ────────────────────────────────────────────────
  await prisma.enrollment.upsert({
    where: {
      studentId_offeringId: {
        studentId: student.id,
        offeringId: seOffering.id,
      },
    },
    update: {},
    create: {
      studentId: student.id,
      offeringId: seOffering.id,
    },
  });

  console.log('✅  Seed complete!');
  console.log('');
  console.log('   Default accounts (password: Admin1234! for all):');
  console.log(`   admin@uni.edu        — Admin`);
  console.log(`   depthead@uni.edu     — Department Head`);
  console.log(`   instructor@uni.edu   — Instructor`);
  console.log(`   student@uni.edu      — Student`);
  console.log('');
  console.log(`   Seeded: ${csDept.name}, ${engDept.name} departments`);
  console.log(`   Seeded: Fall 2024 term`);
  console.log(`   Seeded: CS401 Software Engineering offering (window OPEN)`);
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
