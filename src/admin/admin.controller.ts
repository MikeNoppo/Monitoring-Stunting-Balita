import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('register')
  async register(@Body() regisAdmin: Prisma.userCreateInput) {
    return this.adminService.register(regisAdmin);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('add-child')
  @Roles('ADMIN')
  async addChild(@Body() childData: Prisma.childCreateInput) {
    return this.adminService.addChild(childData);
  }
}
