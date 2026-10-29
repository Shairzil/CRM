import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline schema: exactly what `synchronize: true` used to create.
 *
 * - On an EXISTING database (created earlier by synchronize) the tables are
 *   already there, so this migration does nothing.
 * - On a FRESH database it creates the original tables.
 */
export class InitialSchema1761700000000 implements MigrationInterface {
  name = 'InitialSchema1761700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(`SELECT to_regclass('public.users') IS NOT NULL AS "exists"`);
    if (rows?.[0]?.exists) {
      return; // existing installation — schema already present
    }

    await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "username" character varying NOT NULL, "password" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "employees" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b9535a98350d5b26e7eb0c26af4" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "counselors" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_da5b8b6f1925afaf58186f3c8ae" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "countries" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "currency_code" character varying NOT NULL, "currency_symbol" character varying NOT NULL, "application_fee" numeric(10,2) NOT NULL, CONSTRAINT "PK_b2d7006793e8697ab3ae2deff18" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "sequences" ("key" character varying NOT NULL, "value" integer NOT NULL DEFAULT '1', CONSTRAINT "PK_bc5044d32c589f8c94f230098dc" PRIMARY KEY ("key"))`);
    await queryRunner.query(`CREATE TABLE "students" ("id" SERIAL NOT NULL, "student_id" character varying NOT NULL, "name" character varying NOT NULL, "phone_country_code" character varying NOT NULL, "phone_number" character varying NOT NULL, "email" character varying, "counselor_name" character varying NOT NULL, "study_level" character varying, "source_type" character varying NOT NULL, "source_name" character varying NOT NULL, "date_of_opening" date NOT NULL, "file_opening_fee_bdt" numeric(12,2) NOT NULL, "country_id" integer, "application_fee_foreign" numeric(10,2), "application_fee_bdt" numeric(12,2), "exchange_rate_used" numeric(10,4), "follow_up_date" date, "follow_up_note" character varying, "status" character varying NOT NULL DEFAULT 'Registered', "cv_name" character varying, "cv_mime" character varying, "cv_data" bytea, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ba36f3e3743f80d1cdc51020103" UNIQUE ("student_id"), CONSTRAINT "PK_7d7f07271ad4ce999880713f05e" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "invoices" ("id" SERIAL NOT NULL, "invoice_id" character varying NOT NULL, "student_id" integer, "payer_name" character varying NOT NULL, "payer_phone_country_code" character varying, "payer_phone_number" character varying, "payment_method" character varying, "payment_detail" character varying, "bank_name" character varying, "country_id" integer, "application_fee_bdt" numeric(12,2), "other_fee_bdt" numeric(12,2), "comment" character varying, "total_amount_bdt" numeric(12,2) NOT NULL, "paid_amount_bdt" numeric(12,2) NOT NULL, "due_amount_bdt" numeric(12,2) NOT NULL, "pdf_path" character varying, "information" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a62eb88a23934fb83945c3e58af" UNIQUE ("invoice_id"), CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "student_info" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "phone_country_code" character varying NOT NULL, "phone_number" character varying NOT NULL, "preferred_country" character varying, "preferred_course" character varying, "preferred_course_level" character varying, "preferred_intake" character varying, "ssc_gpa" character varying, "ssc_year" character varying, "hsc_gpa" character varying, "hsc_year" character varying, "bachelor_subject" character varying, "bachelor_university" character varying, "bachelor_cgpa" character varying, "bachelor_year" character varying, "master_subject" character varying, "master_university" character varying, "master_cgpa" character varying, "master_year" character varying, "test_taken" character varying, "overall_score" character varying, "study_gap" character varying, "work_experience" character varying, "visa_refusal" character varying, "estimated_budget" character varying, "counsellor_notes" text, "counselor_name" character varying, "source_type" character varying, "source_name" character varying, "cv_name" character varying, "cv_mime" character varying, "cv_data" bytea, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_09939c9d1ef61c1d76fdbd69623" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "salaries" ("id" SERIAL NOT NULL, "employeeName" character varying NOT NULL, "month" character varying NOT NULL, "baseSalary" numeric(12,2) NOT NULL, "paid" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_20ca60aa8d4201c7bcb430fdb36" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "io_entries" ("id" SERIAL NOT NULL, "employeeName" character varying NOT NULL, "month" character varying NOT NULL, "amount" numeric(12,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e33e17119294d39bff14cafa36a" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "student_follow_ups" ("id" SERIAL NOT NULL, "student_id" integer NOT NULL, "follow_up_date" date NOT NULL, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1062f95f361460822659e949b40" PRIMARY KEY ("id"))`);

    await queryRunner.query(`ALTER TABLE "students" ADD CONSTRAINT "FK_519ef86eb77efdff5a1144d3237" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_0a19069218ffe36a4e4b41c4870" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_d076dd76e7c5044b1a663cc686b" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "student_follow_ups" ADD CONSTRAINT "FK_299f93ee152828b088472687733" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The baseline is never rolled back automatically: it would delete all business data.
    throw new Error('InitialSchema cannot be reverted. Drop the database manually if you really need to.');
  }
}
