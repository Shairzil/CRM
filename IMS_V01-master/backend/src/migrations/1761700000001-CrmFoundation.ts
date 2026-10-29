import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CRM foundation:
 * - roles / active flag / token version on users
 * - ID relations (counselor_id, source_employee_id, collected_by_employee_id)
 *   with a backfill from the old name columns
 * - leads (+ Meta Lead Ads fields), lead_activities
 * - student_documents (files live in storage, not in the DB)
 * - applications + application_status_history
 * - external_accounts (links to other nextED systems)
 *
 * Every statement is idempotent (IF NOT EXISTS), so it is safe on a database
 * that was previously managed by `synchronize: true`.
 */
export class CrmFoundation1761700000001 implements MigrationInterface {
  name = 'CrmFoundation1761700000001';

  private async addForeignKey(
    queryRunner: QueryRunner,
    table: string,
    column: string,
    refTable: string,
    onDelete: string,
    name: string,
  ): Promise<void> {
    const existing = await queryRunner.query(`SELECT 1 FROM pg_constraint WHERE conname = $1`, [name]);
    if (existing.length > 0) return;
    // Clear dangling references first so the constraint can be created.
    await queryRunner.query(
      `UPDATE "${table}" SET "${column}" = NULL WHERE "${column}" IS NOT NULL AND "${column}" NOT IN (SELECT "id" FROM "${refTable}")`,
    );
    await queryRunner.query(
      `ALTER TABLE "${table}" ADD CONSTRAINT "${name}" FOREIGN KEY ("${column}") REFERENCES "${refTable}"("id") ON DELETE ${onDelete} ON UPDATE NO ACTION`,
    );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) New columns on existing tables
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "full_name" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" character varying(20) NOT NULL DEFAULT 'counselor'`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "token_version" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employee_id" integer`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "counselor_id" integer`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "counselor_id" integer`);
    await queryRunner.query(`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "source_employee_id" integer`);
    await queryRunner.query(`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "source_channel" character varying(30)`);
    await queryRunner.query(`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "campaign_name" character varying`);
    await queryRunner.query(`ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "lead_id" integer`);
    await queryRunner.query(`ALTER TABLE "student_info" ADD COLUMN IF NOT EXISTS "counselor_id" integer`);
    await queryRunner.query(`ALTER TABLE "student_info" ADD COLUMN IF NOT EXISTS "source_employee_id" integer`);
    await queryRunner.query(`ALTER TABLE "student_info" ADD COLUMN IF NOT EXISTS "source_channel" character varying(30)`);
    await queryRunner.query(`ALTER TABLE "student_info" ADD COLUMN IF NOT EXISTS "campaign_name" character varying`);
    await queryRunner.query(`ALTER TABLE "student_info" ADD COLUMN IF NOT EXISTS "lead_id" integer`);
    await queryRunner.query(`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "collected_by_employee_id" integer`);
    await queryRunner.query(`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "created_by_user_id" integer`);

    // 2) New CRM tables
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "leads" ("id" SERIAL NOT NULL, "full_name" character varying NOT NULL, "phone_country_code" character varying NOT NULL DEFAULT '+880', "phone_number" character varying, "phone_key" character varying(20), "email" character varying, "source_channel" character varying(30) NOT NULL DEFAULT 'other', "source_detail" character varying, "meta_lead_id" character varying, "meta_form_id" character varying, "campaign_id" character varying, "campaign_name" character varying, "adset_name" character varying, "ad_id" character varying, "ad_name" character varying, "preferred_country" character varying, "preferred_course_level" character varying, "preferred_intake" character varying, "status" character varying(20) NOT NULL DEFAULT 'new', "assigned_to_user_id" integer, "next_follow_up_date" date, "notes" text, "student_info_id" integer, "student_id" integer, "raw_payload" jsonb, "created_by_user_id" integer, "source_created_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cd102ed7a9a4ca7d4d8bfeba406" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "lead_activities" ("id" SERIAL NOT NULL, "lead_id" integer NOT NULL, "user_id" integer, "type" character varying(20) NOT NULL, "content" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1aa1cc6988a817368568ca26bf1" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "student_documents" ("id" SERIAL NOT NULL, "student_id" integer NOT NULL, "document_type" character varying(40) NOT NULL, "title" character varying, "status" character varying(20) NOT NULL DEFAULT 'requested', "request_note" text, "due_date" date, "requested_by_user_id" integer, "file_key" character varying, "file_name" character varying, "file_mime" character varying, "file_size" integer, "uploaded_by_user_id" integer, "uploaded_at" TIMESTAMP, "reviewed_by_user_id" integer, "reviewed_at" TIMESTAMP, "review_note" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b5805e41001d410755048c8dfc4" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "applications" ("id" SERIAL NOT NULL, "student_id" integer NOT NULL, "country_id" integer, "university_name" character varying NOT NULL, "course_name" character varying NOT NULL, "course_level" character varying, "intake" character varying, "status" character varying(30) NOT NULL DEFAULT 'draft', "application_fee" numeric(12,2), "application_fee_currency" character varying(10), "tuition_fee" numeric(12,2), "university_reference" character varying, "submitted_at" date, "decision_at" date, "notes" text, "assigned_to_user_id" integer, "created_by_user_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_938c0a27255637bde919591888f" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "application_status_history" ("id" SERIAL NOT NULL, "application_id" integer NOT NULL, "from_status" character varying(30), "to_status" character varying(30) NOT NULL, "note" text, "changed_by_user_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_62f7e8a5533a7db21218f2e2434" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "external_accounts" ("id" SERIAL NOT NULL, "student_id" integer NOT NULL, "system" character varying(50) NOT NULL, "external_id" character varying NOT NULL, "external_email" character varying, "note" text, "linked_by_user_id" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_48de4cf673dd62798b19df4f7bd" PRIMARY KEY ("id"))`);

    // 3) Indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_leads_phone_key" ON "leads" ("phone_key")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_leads_status" ON "leads" ("status")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_leads_meta_lead_id" ON "leads" ("meta_lead_id") WHERE meta_lead_id IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_student_documents_student" ON "student_documents" ("student_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_applications_student" ON "applications" ("student_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_applications_status" ON "applications" ("status")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_external_accounts_student_system" ON "external_accounts" ("student_id", "system")`);

    // 4) Foreign keys (ID relations instead of names)
    await this.addForeignKey(queryRunner, 'users', 'employee_id', 'employees', 'SET NULL', 'FK_9760615d88ed518196bb79ea03d');
    await this.addForeignKey(queryRunner, 'users', 'counselor_id', 'counselors', 'SET NULL', 'FK_878338aa9d255d17f2e7c0bf4a4');
    await this.addForeignKey(queryRunner, 'students', 'counselor_id', 'counselors', 'SET NULL', 'FK_6182a08ded67ce0fccf24f7ec00');
    await this.addForeignKey(queryRunner, 'students', 'source_employee_id', 'employees', 'SET NULL', 'FK_8086f6c51b0c335651af7123b5b');
    await this.addForeignKey(queryRunner, 'student_info', 'counselor_id', 'counselors', 'SET NULL', 'FK_07d916d4a6e65d07947331ee791');
    await this.addForeignKey(queryRunner, 'student_info', 'source_employee_id', 'employees', 'SET NULL', 'FK_ba6629729b476b7c0cf469de212');
    await this.addForeignKey(queryRunner, 'invoices', 'collected_by_employee_id', 'employees', 'SET NULL', 'FK_db05dbc9682fb0ba892eb04a20b');
    await this.addForeignKey(queryRunner, 'invoices', 'created_by_user_id', 'users', 'SET NULL', 'FK_b62e289be9ae465de0b33e466c1');
    await this.addForeignKey(queryRunner, 'leads', 'assigned_to_user_id', 'users', 'SET NULL', 'FK_50eb859ca6147393991d50e49d9');
    await this.addForeignKey(queryRunner, 'lead_activities', 'lead_id', 'leads', 'CASCADE', 'FK_26316cb0e146683e9e8aee237d4');
    await this.addForeignKey(queryRunner, 'lead_activities', 'user_id', 'users', 'SET NULL', 'FK_4b46e0f5524945037f6d6b02fe5');
    await this.addForeignKey(queryRunner, 'student_documents', 'student_id', 'students', 'CASCADE', 'FK_8b0e086cbeca4ba69aadaac8541');
    await this.addForeignKey(queryRunner, 'student_documents', 'requested_by_user_id', 'users', 'SET NULL', 'FK_5b8a451a6081627eb2ecf0df4f3');
    await this.addForeignKey(queryRunner, 'student_documents', 'uploaded_by_user_id', 'users', 'SET NULL', 'FK_70d0e922db49405554bd8d0b09e');
    await this.addForeignKey(queryRunner, 'student_documents', 'reviewed_by_user_id', 'users', 'SET NULL', 'FK_94f233c130826b9e34a5ffeb5ef');
    await this.addForeignKey(queryRunner, 'applications', 'student_id', 'students', 'CASCADE', 'FK_791e5e9cf054d0295ebfe4491a9');
    await this.addForeignKey(queryRunner, 'applications', 'country_id', 'countries', 'SET NULL', 'FK_216113952f3c9020c4a20d41bca');
    await this.addForeignKey(queryRunner, 'applications', 'assigned_to_user_id', 'users', 'SET NULL', 'FK_9826eda05375deaaac7ade52dd6');
    await this.addForeignKey(queryRunner, 'application_status_history', 'application_id', 'applications', 'CASCADE', 'FK_a461ff43395424ebd6e218deb32');
    await this.addForeignKey(queryRunner, 'application_status_history', 'changed_by_user_id', 'users', 'SET NULL', 'FK_4c05f4a8ab39f1935aa1227af1d');
    await this.addForeignKey(queryRunner, 'external_accounts', 'student_id', 'students', 'CASCADE', 'FK_1397be28de7189fbed5a3d44260');
    await this.addForeignKey(queryRunner, 'external_accounts', 'linked_by_user_id', 'users', 'SET NULL', 'FK_7aef0d647a6b79091320dd77aca');

    // 5) Backfill ID links from the old name columns
    await queryRunner.query(`UPDATE "students" s SET "counselor_id" = c."id" FROM "counselors" c WHERE s."counselor_id" IS NULL AND lower(trim(s."counselor_name")) = lower(trim(c."name"))`);
    await queryRunner.query(`UPDATE "student_info" s SET "counselor_id" = c."id" FROM "counselors" c WHERE s."counselor_id" IS NULL AND lower(trim(s."counselor_name")) = lower(trim(c."name"))`);
    await queryRunner.query(`UPDATE "students" s SET "source_employee_id" = e."id" FROM "employees" e WHERE s."source_employee_id" IS NULL AND s."source_type" = 'employee' AND lower(trim(s."source_name")) = lower(trim(e."name"))`);
    await queryRunner.query(`UPDATE "student_info" s SET "source_employee_id" = e."id" FROM "employees" e WHERE s."source_employee_id" IS NULL AND s."source_type" = 'employee' AND lower(trim(s."source_name")) = lower(trim(e."name"))`);

    // 6) Normalised source channel for existing records
    for (const table of ['students', 'student_info']) {
      await queryRunner.query(`UPDATE "${table}" SET "source_channel" = CASE
          WHEN lower(coalesce("source_type", '')) = 'employee' THEN 'employee_reference'
          WHEN lower(coalesce("source_name", '')) LIKE '%meta%' THEN 'meta_ads'
          WHEN lower(coalesce("source_name", '')) LIKE '%facebook%' OR lower(coalesce("source_name", '')) = 'fb' THEN 'facebook'
          WHEN lower(coalesce("source_name", '')) LIKE '%instagram%' THEN 'instagram'
          WHEN lower(coalesce("source_name", '')) LIKE '%linkedin%' THEN 'linkedin'
          WHEN lower(coalesce("source_name", '')) LIKE '%call%' THEN 'calling_team'
          WHEN lower(coalesce("source_name", '')) LIKE '%refer%' THEN 'reference'
          WHEN lower(coalesce("source_name", '')) LIKE '%web%' THEN 'website'
          WHEN lower(coalesce("source_name", '')) LIKE '%walk%' THEN 'walk_in'
          ELSE 'other' END
        WHERE "source_channel" IS NULL`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "external_accounts" DROP CONSTRAINT IF EXISTS "FK_7aef0d647a6b79091320dd77aca"`);
    await queryRunner.query(`ALTER TABLE "external_accounts" DROP CONSTRAINT IF EXISTS "FK_1397be28de7189fbed5a3d44260"`);
    await queryRunner.query(`ALTER TABLE "application_status_history" DROP CONSTRAINT IF EXISTS "FK_4c05f4a8ab39f1935aa1227af1d"`);
    await queryRunner.query(`ALTER TABLE "application_status_history" DROP CONSTRAINT IF EXISTS "FK_a461ff43395424ebd6e218deb32"`);
    await queryRunner.query(`ALTER TABLE "applications" DROP CONSTRAINT IF EXISTS "FK_9826eda05375deaaac7ade52dd6"`);
    await queryRunner.query(`ALTER TABLE "applications" DROP CONSTRAINT IF EXISTS "FK_216113952f3c9020c4a20d41bca"`);
    await queryRunner.query(`ALTER TABLE "applications" DROP CONSTRAINT IF EXISTS "FK_791e5e9cf054d0295ebfe4491a9"`);
    await queryRunner.query(`ALTER TABLE "student_documents" DROP CONSTRAINT IF EXISTS "FK_94f233c130826b9e34a5ffeb5ef"`);
    await queryRunner.query(`ALTER TABLE "student_documents" DROP CONSTRAINT IF EXISTS "FK_70d0e922db49405554bd8d0b09e"`);
    await queryRunner.query(`ALTER TABLE "student_documents" DROP CONSTRAINT IF EXISTS "FK_5b8a451a6081627eb2ecf0df4f3"`);
    await queryRunner.query(`ALTER TABLE "student_documents" DROP CONSTRAINT IF EXISTS "FK_8b0e086cbeca4ba69aadaac8541"`);
    await queryRunner.query(`ALTER TABLE "lead_activities" DROP CONSTRAINT IF EXISTS "FK_4b46e0f5524945037f6d6b02fe5"`);
    await queryRunner.query(`ALTER TABLE "lead_activities" DROP CONSTRAINT IF EXISTS "FK_26316cb0e146683e9e8aee237d4"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "FK_50eb859ca6147393991d50e49d9"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "FK_b62e289be9ae465de0b33e466c1"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "FK_db05dbc9682fb0ba892eb04a20b"`);
    await queryRunner.query(`ALTER TABLE "student_info" DROP CONSTRAINT IF EXISTS "FK_ba6629729b476b7c0cf469de212"`);
    await queryRunner.query(`ALTER TABLE "student_info" DROP CONSTRAINT IF EXISTS "FK_07d916d4a6e65d07947331ee791"`);
    await queryRunner.query(`ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "FK_8086f6c51b0c335651af7123b5b"`);
    await queryRunner.query(`ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "FK_6182a08ded67ce0fccf24f7ec00"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_878338aa9d255d17f2e7c0bf4a4"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_9760615d88ed518196bb79ea03d"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_external_accounts_student_system"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_applications_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_applications_student"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_student_documents_student"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_leads_meta_lead_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_leads_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_leads_phone_key"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "external_accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "application_status_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "applications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lead_activities"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leads"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "created_by_user_id"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "collected_by_employee_id"`);
    await queryRunner.query(`ALTER TABLE "student_info" DROP COLUMN IF EXISTS "lead_id"`);
    await queryRunner.query(`ALTER TABLE "student_info" DROP COLUMN IF EXISTS "campaign_name"`);
    await queryRunner.query(`ALTER TABLE "student_info" DROP COLUMN IF EXISTS "source_channel"`);
    await queryRunner.query(`ALTER TABLE "student_info" DROP COLUMN IF EXISTS "source_employee_id"`);
    await queryRunner.query(`ALTER TABLE "student_info" DROP COLUMN IF EXISTS "counselor_id"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN IF EXISTS "lead_id"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN IF EXISTS "campaign_name"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN IF EXISTS "source_channel"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN IF EXISTS "source_employee_id"`);
    await queryRunner.query(`ALTER TABLE "students" DROP COLUMN IF EXISTS "counselor_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "updated_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "last_login_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "counselor_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "employee_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "token_version"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "is_active"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "full_name"`);
  }
}
