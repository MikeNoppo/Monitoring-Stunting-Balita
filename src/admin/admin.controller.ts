import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Prisma } from '@prisma/client';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('register')
  async register (@Body() regisAdmin : Prisma.userCreateInput) {
      await this.adminService.register(regisAdmin);
  }
}
