-- CreateEnum
CREATE TYPE "Role" AS ENUM ('student', 'instructor', 'dept_head', 'admin');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('likert', 'single_choice', 'multi_choice', 'open_text');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('eval_open', 'eval_reminder', 'submission_confirm', 'result_released');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('email', 'in_app');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(60),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "role" "Role" NOT NULL,
    "department_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "password_reset_token" VARCHAR(128),
    "password_reset_expires" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "head_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(20) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "credits" SMALLINT NOT NULL,
    "department_id" UUID NOT NULL,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_offerings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "instructor_id" UUID NOT NULL,
    "section" VARCHAR(20) NOT NULL DEFAULT 'A',
    "eval_form_id" UUID,
    "eval_window_open" TIMESTAMPTZ,
    "eval_window_close" TIMESTAMPTZ,
    "min_responses_threshold" SMALLINT NOT NULL DEFAULT 5,
    "results_released" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "course_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "offering_id" UUID NOT NULL,
    "enrolled_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_form_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "version" SMALLINT NOT NULL DEFAULT 1,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "eval_form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "order_index" SMALLINT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "text" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "options" JSONB,
    "scale_min" SMALLINT,
    "scale_max" SMALLINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "eval_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participation_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "offering_id" UUID NOT NULL,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMPTZ,
    "draft_saved_at" TIMESTAMPTZ,

    CONSTRAINT "participation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "offering_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(50),
    "target_id" UUID,
    "metadata" JSONB,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMPTZ,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "courses_code_department_id_key" ON "courses"("code", "department_id");

-- CreateIndex
CREATE INDEX "course_offerings_term_id_idx" ON "course_offerings"("term_id");

-- CreateIndex
CREATE INDEX "course_offerings_instructor_id_idx" ON "course_offerings"("instructor_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_offerings_course_id_term_id_section_key" ON "course_offerings"("course_id", "term_id", "section");

-- CreateIndex
CREATE INDEX "enrollments_student_id_idx" ON "enrollments"("student_id");

-- CreateIndex
CREATE INDEX "enrollments_offering_id_idx" ON "enrollments"("offering_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_student_id_offering_id_key" ON "enrollments"("student_id", "offering_id");

-- CreateIndex
CREATE INDEX "eval_questions_template_id_idx" ON "eval_questions"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "participation_tokens_student_id_offering_id_key" ON "participation_tokens"("student_id", "offering_id");

-- CreateIndex
CREATE INDEX "responses_offering_id_question_id_idx" ON "responses"("offering_id", "question_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_idx" ON "audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_head_id_fkey" FOREIGN KEY ("head_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_eval_form_id_fkey" FOREIGN KEY ("eval_form_id") REFERENCES "eval_form_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "course_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_form_templates" ADD CONSTRAINT "eval_form_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_questions" ADD CONSTRAINT "eval_questions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "eval_form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation_tokens" ADD CONSTRAINT "participation_tokens_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation_tokens" ADD CONSTRAINT "participation_tokens_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "course_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "course_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "eval_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
