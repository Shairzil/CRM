import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

import { ALL_ENTITIES } from './entities';
import { ALL_MIGRATIONS } from './migrations';

import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { UsersModule } from './users/users.module';
import { EmployeesModule } from './employees/employees.module';
import { CounselorsModule } from './counselors/counselors.module';
import { CountriesModule } from './countries/countries.module';
import { CurrencyModule } from './currency/currency.module';
import { StudentsModule } from './students/students.module';
import { InvoicesModule } from './invoices/invoices.module';
import { SalaryModule } from './salary/salary.module';
import { IOModule } from './io/io.module';
import { StorageModule } from './storage/storage.module';
import { LeadsModule } from './leads/leads.module';
import { DocumentsModule } from './documents/documents.module';
import { ApplicationsModule } from './applications/applications.module';
import { ExternalAccountsModule } from './external-accounts/external-accounts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<string>('DB_PORT') || 5432),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: ALL_ENTITIES,
        // Schema changes now go through versioned migrations (src/migrations),
        // never through synchronize — renaming a column can no longer wipe data.
        synchronize: false,
        migrations: ALL_MIGRATIONS,
        // Pending migrations are applied automatically on start-up.
        // Set DB_MIGRATIONS_RUN=false to run them manually (npm run migration:run).
        migrationsRun: configService.get<string>('DB_MIGRATIONS_RUN') !== 'false',
      }),
    }),
    StorageModule,
    AuthModule,
    UsersModule,
    EmployeesModule,
    CounselorsModule,
    CountriesModule,
    CurrencyModule,
    StudentsModule,
    InvoicesModule,
    SalaryModule,
    IOModule,
    LeadsModule,
    DocumentsModule,
    ApplicationsModule,
    ExternalAccountsModule,
  ],
  providers: [
    // Order matters: first "is the user logged in?", then "is the role allowed?"
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
