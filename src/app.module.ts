import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, UsersModule,ThrottlerModule.forRoot([
    {
      name: 'auth',
      ttl: '1000',
      limit: '10',
    }
  ])],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
