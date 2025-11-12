-- Create notes table
CREATE TABLE IF NOT EXISTS "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"questionId" integer,
	"content" text NOT NULL,
	"headline" varchar(255),
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);

-- Create tags table
CREATE TABLE IF NOT EXISTS "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"createdAt" timestamp DEFAULT now()
);

-- Create note_tags junction table
CREATE TABLE IF NOT EXISTS "note_tags" (
	"noteId" integer NOT NULL,
	"tagId" integer NOT NULL,
	CONSTRAINT "note_tags_noteId_tagId_pk" PRIMARY KEY("noteId","tagId")
);

-- Create generated_questions table
CREATE TABLE IF NOT EXISTS "generated_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"noteId" integer NOT NULL,
	"questionText" text NOT NULL,
	"options" jsonb NOT NULL,
	"correctAnswerIndex" integer NOT NULL,
	"explanation" text,
	"difficulty" varchar(20) DEFAULT 'medium',
	"createdAt" timestamp DEFAULT now()
);

-- Create note_quiz_attempts table
CREATE TABLE IF NOT EXISTS "note_quiz_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"noteId" integer NOT NULL,
	"userId" integer NOT NULL,
	"score" integer NOT NULL,
	"totalQuestions" integer NOT NULL,
	"completedAt" timestamp DEFAULT now()
);

-- Add foreign keys
DO $$ BEGIN
 ALTER TABLE "notes" ADD CONSTRAINT "notes_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "notes" ADD CONSTRAINT "notes_questionId_questions_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "note_tags" ADD CONSTRAINT "note_tags_noteId_notes_id_fk" FOREIGN KEY ("noteId") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "note_tags" ADD CONSTRAINT "note_tags_tagId_tags_id_fk" FOREIGN KEY ("tagId") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "generated_questions" ADD CONSTRAINT "generated_questions_noteId_notes_id_fk" FOREIGN KEY ("noteId") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "note_quiz_attempts" ADD CONSTRAINT "note_quiz_attempts_noteId_notes_id_fk" FOREIGN KEY ("noteId") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "note_quiz_attempts" ADD CONSTRAINT "note_quiz_attempts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_notes_user_id" ON "notes" USING btree ("userId");
CREATE INDEX IF NOT EXISTS "idx_notes_question_id" ON "notes" USING btree ("questionId");
CREATE INDEX IF NOT EXISTS "idx_tags_type" ON "tags" USING btree ("type");
CREATE INDEX IF NOT EXISTS "idx_tags_name" ON "tags" USING btree ("name");
CREATE INDEX IF NOT EXISTS "idx_note_tags_note_id" ON "note_tags" USING btree ("noteId");
CREATE INDEX IF NOT EXISTS "idx_note_tags_tag_id" ON "note_tags" USING btree ("tagId");
CREATE INDEX IF NOT EXISTS "idx_generated_questions_note_id" ON "generated_questions" USING btree ("noteId");
CREATE INDEX IF NOT EXISTS "idx_note_quiz_attempts_user_id" ON "note_quiz_attempts" USING btree ("userId");
CREATE INDEX IF NOT EXISTS "idx_note_quiz_attempts_note_id" ON "note_quiz_attempts" USING btree ("noteId");
