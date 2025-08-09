import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private usersService: UsersService,
    private mail: MailService,
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
        data: {
          email: dto.email,
          name: dto.name,
          password: hash,
          role: 'ORANG_TUA',
        },
        select: { id: true, email: true, name: true, role: true },
      });
      return {
        message: 'User registered successfully',
        data: user,
      };
    } catch (e: any) {
      if (e.code === 'P2002')
        throw new ConflictException('Email already exists');
      throw e;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await argon2.verify(user.password, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    const token = this.signToken(user);
    return {
      message: 'Login successful',
      ...token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (user) {
      // Invalidate existing tokens for this user (optional hardening)
      await this.prisma.password_reset
        .deleteMany({ where: { userId: user.id } })
        .catch(() => undefined);

      // Create single-use token by storing digest only
      const rawToken = cryptoRandomToken();
      const digest = await argon2.hash(rawToken);
      const expiresAt = new Date(
        Date.now() + (Number(process.env.RESET_TOKEN_TTL_MS) || 1000 * 60 * 15),
      ); // 15m default

      await this.prisma.password_reset.create({
        data: { userId: user.id, tokenDigest: digest, expiresAt },
      });

      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(email)}`;
      await this.mail.sendMail({
        to: email,
        subject: 'Reset Password Instructions',
        text: `Klik tautan berikut untuk mengganti password Anda (berlaku 15 menit): ${resetUrl}`,
        html: `Silakan klik tautan berikut untuk mengganti password Anda (berlaku 15 menit): <a href="${resetUrl}">Reset Password</a>`,
      });
    }
    return { success: true };
  }

  async resetPassword(token: string, email: string, newPassword: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('Invalid token');

    // Find valid reset entries
    const pr = await this.prisma.password_reset.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { id: 'desc' },
    });
    if (!pr) throw new BadRequestException('Invalid or expired token');

    const matches = await argon2.verify(pr.tokenDigest, token);
    if (!matches) throw new BadRequestException('Invalid or expired token');

    // Rotate password and mark token used (single-use)
    const hash = await argon2.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { password: hash },
      }),
      this.prisma.password_reset.update({
        where: { id: pr.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.password_reset.deleteMany({
        where: { userId: user.id, id: { not: pr.id } },
      }), // cleanup others
    ]);

    return { message: 'Password updated' };
  }
}

function cryptoRandomToken(length = 48) {
  // URL-safe base64 token
  const bytes = randomBytes(length);
  return bytes.toString('base64url');
}
