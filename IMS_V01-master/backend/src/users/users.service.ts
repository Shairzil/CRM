import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../common/roles';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  private toPublic(user: User) {
    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      employee_id: user.employee_id,
      employee_name: user.employee?.name ?? null,
      counselor_id: user.counselor_id,
      counselor_name: user.counselor?.name ?? null,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
    };
  }

  async findAll() {
    const users = await this.usersRepository.find({
      relations: { employee: true, counselor: true },
      order: { username: 'ASC' },
    });
    return users.map((u) => this.toPublic(u));
  }

  /** Small list for dropdowns (assign lead / application to a user). */
  async findAssignable() {
    const users = await this.usersRepository.find({ where: { is_active: true }, order: { username: 'ASC' } });
    return users.map((u) => ({ id: u.id, username: u.username, full_name: u.full_name, role: u.role }));
  }

  async create(dto: CreateUserDto) {
    const exists = await this.usersRepository
      .createQueryBuilder('u')
      .where('LOWER(u.username) = LOWER(:username)', { username: dto.username })
      .getOne();
    if (exists) throw new ConflictException(`Username "${dto.username}" is already taken.`);

    const user = this.usersRepository.create({
      username: dto.username,
      password: await bcrypt.hash(dto.password, 10),
      full_name: dto.full_name ?? null,
      role: dto.role,
      employee_id: dto.employee_id ?? null,
      counselor_id: dto.counselor_id ?? null,
      is_active: true,
      token_version: 0,
    });
    const saved = await this.usersRepository.save(user);
    return this.findOne(saved.id);
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findOne({ where: { id }, relations: { employee: true, counselor: true } });
    if (!user) throw new NotFoundException(`User ${id} not found.`);
    return this.toPublic(user);
  }

  async update(id: number, dto: UpdateUserDto, actingUserId: number) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found.`);

    if (id === actingUserId) {
      if (dto.role !== undefined && dto.role !== Role.ADMIN) {
        throw new BadRequestException('You cannot remove your own admin role.');
      }
      if (dto.is_active === false) {
        throw new BadRequestException('You cannot deactivate your own account.');
      }
    }

    if (dto.full_name !== undefined) user.full_name = dto.full_name;
    if (dto.employee_id !== undefined) user.employee_id = dto.employee_id;
    if (dto.counselor_id !== undefined) user.counselor_id = dto.counselor_id;

    let invalidateSessions = false;
    if (dto.role !== undefined && dto.role !== user.role) {
      user.role = dto.role;
      invalidateSessions = true;
    }
    if (dto.is_active !== undefined && dto.is_active !== user.is_active) {
      user.is_active = dto.is_active;
      invalidateSessions = true;
    }
    if (invalidateSessions) user.token_version = (user.token_version ?? 0) + 1;

    await this.usersRepository.save(user);
    return this.findOne(id);
  }

  async resetPassword(id: number, password: string) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found.`);
    await this.usersRepository.update(id, {
      password: await bcrypt.hash(password, 10),
      token_version: (user.token_version ?? 0) + 1,
    });
    return { success: true };
  }
}
