import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../entities/lead.entity';
import { LeadActivity } from '../entities/lead-activity.entity';
import { StudentInfo } from '../entities/student-info.entity';
import { User } from '../entities/user.entity';
import { LeadsService } from './leads.service';
import { MetaLeadsService } from './meta-leads.service';
import { LeadsController } from './leads.controller';
import { MetaWebhookController } from './meta-webhook.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, LeadActivity, StudentInfo, User])],
  providers: [LeadsService, MetaLeadsService],
  controllers: [LeadsController, MetaWebhookController],
  exports: [LeadsService],
})
export class LeadsModule {}
