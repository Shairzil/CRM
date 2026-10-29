import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Country } from './entities/country.entity';
import { Employee } from './entities/employee.entity';
import { Counselor } from './entities/counselor.entity';
import { StudentInfo } from './entities/student-info.entity';
import { Student } from './entities/student.entity';
import { Invoice } from './entities/invoice.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

async function seed() {
  console.log('Bootstrapping NestJS application context for seeding...');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const countryRepository = app.get<Repository<Country>>(getRepositoryToken(Country));
    const employeeRepository = app.get<Repository<Employee>>(getRepositoryToken(Employee));
    const counselorRepository = app.get<Repository<Counselor>>(getRepositoryToken(Counselor));
    const studentInfoRepository = app.get<Repository<StudentInfo>>(getRepositoryToken(StudentInfo));
    const studentRepository = app.get<Repository<Student>>(getRepositoryToken(Student));
    const invoiceRepository = app.get<Repository<Invoice>>(getRepositoryToken(Invoice));

    console.log('Seeding Users...');

    // Remove old admin user if it exists
    const oldAdmin = await userRepository.findOne({ where: { username: 'admin' } });
    if (oldAdmin) {
      await userRepository.remove(oldAdmin);
      console.log('✓ Removed old admin user');
    }

    // List of all users to seed
    const usersToSeed = [
      { username: 'Nawrose', password: '@Nawrose07' },
      { username: 'Mostafiz', password: 'mosta123!@#' },
      { username: 'Ryu', password: 'Ryu@&123' },
      { username: 'Shairzil', password: 'Shairzil@123' },
      { username: 'fahim', password: 'fahim12??12' },
      { username: 'nadia', password: 'nadia12??' },
      { username: 'fahad', password: 'fahad??' },
      { username: 'cathrin', password: '2026nexted' },
      { username: 'ishfatjahin', password: 'jahin12??' },
      { username: 'nipa', password: 'nipa12??' },
      { username: 'samia', password: 'samia123' },
      { username: 'dip', password: 'dip123' },
    ];

    for (const u of usersToSeed) {
      const exists = await userRepository.findOne({ where: { username: u.username } });
      if (!exists) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        await userRepository.save(
          userRepository.create({ username: u.username, password: hashedPassword })
        );
        console.log(`✓ Seeded user: ${u.username}`);
      } else {
        console.log(`✓ User ${u.username} already exists`);
      }
    }

    console.log('Seeding Countries...');
    const countriesData = [
      { name: 'USA', currency_code: 'USD', currency_symbol: '$', application_fee: 15 },
      { name: 'Canada', currency_code: 'CAD', currency_symbol: 'CA$', application_fee: 20 },
      { name: 'Australia', currency_code: 'AUD', currency_symbol: 'A$', application_fee: 10 },
      { name: 'UK', currency_code: 'GBP', currency_symbol: '£', application_fee: 25 },
      { name: 'Germany', currency_code: 'EUR', currency_symbol: '€', application_fee: 20 },
      { name: 'New Zealand', currency_code: 'NZD', currency_symbol: 'NZ$', application_fee: 18 },
    ];

    for (const c of countriesData) {
      const exists = await countryRepository.findOne({ where: { name: c.name } });
      if (!exists) {
        await countryRepository.save(countryRepository.create(c));
        console.log(`✓ Country: ${c.name} seeded`);
      } else {
        console.log(`✓ Country: ${c.name} already exists`);
      }
    }

    console.log('Seeding Employees...');
    const employeesData = ['Nipa', 'Samia', 'Nadia', 'Katherine', 'Cathrin', 'Ishfatjahin', 'Dip'];

    // Clean up any old seeded employees not in the new list
    const allExistingEmployees = await employeeRepository.find();
    for (const emp of allExistingEmployees) {
      if (!employeesData.includes(emp.name)) {
        await employeeRepository.delete(emp.id);
        console.log(`✗ Removed old Employee: ${emp.name}`);
      }
    }

    for (const empName of employeesData) {
      const exists = await employeeRepository.findOne({ where: { name: empName } });
      if (!exists) {
        await employeeRepository.save(employeeRepository.create({ name: empName }));
        console.log(`✓ Employee: ${empName} seeded`);
      } else {
        console.log(`✓ Employee: ${empName} already exists`);
      }
    }

    console.log('Seeding Counselors...');
    const counselorsData = ['Fahad', 'Fahim', 'Safat', 'Nawroj', 'Mustafiz', 'Khushboo'];

    // Clean up any old seeded counselors not in the new list
    const allExistingCounselors = await counselorRepository.find();
    for (const c of allExistingCounselors) {
      if (!counselorsData.includes(c.name)) {
        await counselorRepository.delete(c.id);
        console.log(`✗ Removed old Counselor: ${c.name}`);
      }
    }

    for (const cName of counselorsData) {
      const exists = await counselorRepository.findOne({ where: { name: cName } });
      if (!exists) {
        await counselorRepository.save(counselorRepository.create({ name: cName }));
        console.log(`✓ Counselor: ${cName} seeded`);
      } else {
        console.log(`✓ Counselor: ${cName} already exists`);
      }
    }

    console.log('Clearing all Invoice, Student, and StudentInfo data for a fresh start...');
    await invoiceRepository.createQueryBuilder().delete().execute();
    await studentRepository.createQueryBuilder().delete().execute();
    await studentInfoRepository.createQueryBuilder().delete().execute();
    console.log('✓ All student and invoice data cleared — app is ready for real data.');

    console.log('✓ Database Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await app.close();
  }
}

seed();
