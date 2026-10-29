/**
 * Safe seed: only ADDS reference data that is missing.
 *
 *  - Never deletes students, invoices, employees or counselors.
 *  - Never contains passwords. The first admin comes from .env:
 *        SEED_ADMIN_USERNAME=youradmin
 *        SEED_ADMIN_PASSWORD=<a strong password, 12+ chars>
 *    If that user already exists it is only promoted to admin
 *    (its password is NOT changed).
 *
 * Run:  npm run seed
 */
import dataSource from './data-source';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Country } from './entities/country.entity';
import { Employee } from './entities/employee.entity';
import { Counselor } from './entities/counselor.entity';

async function seed() {
  await dataSource.initialize();
  console.log('Running pending migrations...');
  await dataSource.runMigrations();

  try {
    const users = dataSource.getRepository(User);
    const countries = dataSource.getRepository(Country);
    const employees = dataSource.getRepository(Employee);
    const counselors = dataSource.getRepository(Counselor);

    // ── Admin user ────────────────────────────────────────────────────────
    const adminUsername = process.env.SEED_ADMIN_USERNAME?.trim();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (adminUsername) {
      const existing = await users
        .createQueryBuilder('u')
        .where('LOWER(u.username) = LOWER(:name)', { name: adminUsername })
        .getOne();
      if (existing) {
        if (existing.role !== 'admin') {
          existing.role = 'admin';
          existing.token_version = (existing.token_version ?? 0) + 1;
          await users.save(existing);
          console.log(`✓ Promoted existing user "${existing.username}" to admin`);
        } else {
          console.log(`✓ Admin "${existing.username}" already exists`);
        }
      } else if (!adminPassword || adminPassword.length < 12) {
        console.log('✗ SEED_ADMIN_PASSWORD missing or shorter than 12 characters — admin not created.');
      } else {
        await users.save(
          users.create({
            username: adminUsername,
            password: await bcrypt.hash(adminPassword, 10),
            full_name: adminUsername,
            role: 'admin',
            is_active: true,
            token_version: 0,
          }),
        );
        console.log(`✓ Created admin user "${adminUsername}"`);
      }
    } else {
      console.log('i SEED_ADMIN_USERNAME not set — skipping admin user.');
    }

    // ── Countries ─────────────────────────────────────────────────────────
    const countriesData = [
      { name: 'USA', currency_code: 'USD', currency_symbol: '$', application_fee: 15 },
      { name: 'Canada', currency_code: 'CAD', currency_symbol: 'CA$', application_fee: 20 },
      { name: 'Australia', currency_code: 'AUD', currency_symbol: 'A$', application_fee: 10 },
      { name: 'UK', currency_code: 'GBP', currency_symbol: '£', application_fee: 25 },
      { name: 'Germany', currency_code: 'EUR', currency_symbol: '€', application_fee: 20 },
      { name: 'New Zealand', currency_code: 'NZD', currency_symbol: 'NZ$', application_fee: 18 },
    ];
    for (const c of countriesData) {
      if (!(await countries.findOne({ where: { name: c.name } }))) {
        await countries.save(countries.create(c));
        console.log(`✓ Country ${c.name} added`);
      }
    }

    // ── Employees & counselors (only added when missing, never removed) ───
    for (const name of ['Nipa', 'Samia', 'Nadia', 'Katherine', 'Cathrin', 'Ishfatjahin', 'Dip']) {
      if (!(await employees.findOne({ where: { name } }))) {
        await employees.save(employees.create({ name }));
        console.log(`✓ Employee ${name} added`);
      }
    }
    for (const name of ['Fahad', 'Fahim', 'Safat', 'Nawroj', 'Mustafiz', 'Khushboo']) {
      if (!(await counselors.findOne({ where: { name } }))) {
        await counselors.save(counselors.create({ name }));
        console.log(`✓ Counselor ${name} added`);
      }
    }

    console.log('✓ Seeding finished. No existing data was deleted.');
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
