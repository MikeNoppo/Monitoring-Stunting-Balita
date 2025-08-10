import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
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
  @Roles('ADMIN','DOKTER','PEGAWAI')
  async addChild(@Body() childData: Prisma.childCreateInput) {
    return this.adminService.addChild(childData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN','PEGAWAI','DOKTER')
  @Get('parents')
  async listParents(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    return this.adminService.listParents({ q: q?.trim() || undefined, take });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN','DOKTER','PEGAWAI')
  @Get('children')
  async listChildren(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const pageNum = Math.max(Number(page) || 1, 1);
    const skip = (pageNum - 1) * take;
    return this.adminService.listChildren({ q: q?.trim() || undefined, take, skip });
  }
}
