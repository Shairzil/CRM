/**
 * Command-line user management (useful for the very first admin, or if
 * everyone is locked out).
 *
 *   npm run user -- list
 *   npm run user -- set-role <username> <admin|accounts|counselor|telecaller>
 *   npm run user -- reset-password <username> <new-password>
 *   npm run user -- create <username> <password> <role> [full name]
 *   npm run user -- deactivate <username>
 *   npm run user -- activate <username>
 */
import dataSource from '../data-source';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { ALL_ROLES, Role } from '../common/roles';

async function main() {
  const [command, ...args] = process.argv.slice(2);
  await dataSource.initialize();
  await dataSource.runMigrations();
  const users = dataSource.getRepository(User);

  const find = async (username: string) => {
    const user = await users
      .createQueryBuilder('u')
      .where('LOWER(u.username) = LOWER(:username)', { username })
      .getOne();
    if (!user) throw new Error(`User "${username}" not found.`);
    return user;
  };

  try {
    switch (command) {
      case 'list': {
        const all = await users.find({ order: { username: 'ASC' } });
        console.table(all.map((u) => ({ id: u.id, username: u.username, role: u.role, active: u.is_active })));
        break;
      }
      case 'set-role': {
        const [username, role] = args;
        if (!ALL_ROLES.includes(role as Role)) throw new Error(`Role must be one of: ${ALL_ROLES.join(', ')}`);
        const user = await find(username);
        user.role = role;
        user.token_version = (user.token_version ?? 0) + 1;
        await users.save(user);
        console.log(`✓ ${user.username} is now ${role}`);
        break;
      }
      case 'reset-password': {
        const [username, password] = args;
        if (!password || password.length < 8) throw new Error('Password must be at least 8 characters.');
        const user = await find(username);
        await users.update(user.id, {
          password: await bcrypt.hash(password, 10),
          token_version: (user.token_version ?? 0) + 1,
        });
        console.log(`✓ Password reset for ${user.username}`);
        break;
      }
      case 'create': {
        const [username, password, role, ...nameParts] = args;
        if (!username || !password || password.length < 8) throw new Error('Usage: create <username> <password(8+)> <role> [full name]');
        if (!ALL_ROLES.includes(role as Role)) throw new Error(`Role must be one of: ${ALL_ROLES.join(', ')}`);
        await users.save(
          users.create({
            username,
            password: await bcrypt.hash(password, 10),
            role,
            full_name: nameParts.join(' ') || null,
            is_active: true,
            token_version: 0,
          }),
        );
        console.log(`✓ Created ${username} (${role})`);
        break;
      }
      case 'activate':
      case 'deactivate': {
        const user = await find(args[0]);
        user.is_active = command === 'activate';
        user.token_version = (user.token_version ?? 0) + 1;
        await users.save(user);
        console.log(`✓ ${user.username} ${command}d`);
        break;
      }
      default:
        console.log('Commands: list | set-role <user> <role> | reset-password <user> <pw> | create <user> <pw> <role> [name] | activate <user> | deactivate <user>');
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('✗', err.message || err);
  process.exit(1);
});
