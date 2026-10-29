import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeadPlatform1761800000000 implements MigrationInterface {
  name = 'LeadPlatform1761800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "platform" character varying(20)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "platform"`);
  }
}
