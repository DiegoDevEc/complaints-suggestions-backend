import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { log } from 'console';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email already exists');
    }
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create(
      {
        username: dto.username,
        email: dto.email,
        password: hashed,
        status: 'ACT',
      },
      {
        name: dto.name,
        lastname: dto.lastname,
        dni: dto.dni,
        phone: dto.phone,
      },
    );
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }

  async updateUser(id: string, dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing && existing.id !== id) {
      throw new BadRequestException('Email already exists');
    }
    const user = await this.usersService.update(
      id,
      {
        username: dto.username,
        email: dto.email,
        status: 'ACT',
      },
      {
        name: dto.name,
        lastname: dto.lastname,
        dni: dto.dni,
        phone: dto.phone,
      },
    );
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }

  async deleteUser(id: string) {
    const user = await this.usersService.delete(id);
    if (!user) {
      throw new BadRequestException('User not found');
    }
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return null;
    }
    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.isFirstLogin) {
      user.isFirstLogin = false;
      await user.save();
    }
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
