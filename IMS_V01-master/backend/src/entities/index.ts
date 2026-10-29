import { User } from './user.entity';
import { Employee } from './employee.entity';
import { Counselor } from './counselor.entity';
import { Country } from './country.entity';
import { Sequence } from './sequence.entity';
import { Student } from './student.entity';
import { Invoice } from './invoice.entity';
import { StudentInfo } from './student-info.entity';
import { StudentFollowUp } from './student-follow-up.entity';
import { Salary } from './salary.entity';
import { IOEntry } from './io-entry.entity';
import { Lead } from './lead.entity';
import { LeadActivity } from './lead-activity.entity';
import { StudentDocument } from './student-document.entity';
import { Application } from './application.entity';
import { ApplicationStatusHistory } from './application-status-history.entity';
import { ExternalAccount } from './external-account.entity';

/** Every entity, used by both the Nest app and the TypeORM CLI data source. */
export const ALL_ENTITIES = [
  User,
  Employee,
  Counselor,
  Country,
  Sequence,
  Student,
  Invoice,
  StudentInfo,
  StudentFollowUp,
  Salary,
  IOEntry,
  Lead,
  LeadActivity,
  StudentDocument,
  Application,
  ApplicationStatusHistory,
  ExternalAccount,
];
