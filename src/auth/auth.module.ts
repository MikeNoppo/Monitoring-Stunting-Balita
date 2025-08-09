import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from 'nestjs-prisma';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [
    UsersModule,
    PrismaModule.forRoot({ isGlobal: true }),
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.ACCESS_TOKEN_SECRET,
        signOptions: { expiresIn: '1h' },
      }),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'login',
        ttl: 60_000,
        limit: 5,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    MailService,
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // global rate limit guard (login route will use specific named limiter)
  ],
  exports: [AuthService],
})
export class AuthModule {}
