import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private usersService: UsersService,
  ) {}

  private signToken(user: { id: number; role: string; email: string }) {
    const payload = { sub: user.id, role: user.role, email: user.email };
    const accessToken = this.jwt.sign(payload);
    return { accessToken };
  }

  async register(dto: RegisterDto) {
    try {
      const hash = await argon2.hash(dto.password);
      const user = await this.prisma.user.create({
        data: { email: dto.email, name: dto.name, password: hash, role: 'ORANG_TUA' },
        select: { id: true, email: true, name: true, role: true },
      });
      return user;
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('Email already exists');
      throw e;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await argon2.verify(user.password, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    const token = this.signToken(user);
    return { ...token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }

  async forgotPassword(email: string) {
    // Minimal placeholder: do not reveal existence
    const user = await this.usersService.findByEmail(email);
    if (user) {
      // In future: create reset token record & send email.
      // For now, no-op.
    }
    return true;
  }
}

