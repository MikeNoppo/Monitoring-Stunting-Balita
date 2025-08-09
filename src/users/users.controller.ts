import {
  Controller,
  Get,
  UseGuards,
  Param,
  Patch,
  Body,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService, Role } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: Role,
    @CurrentUser() user: any,
  ) {
    if (user.id === id) throw new ForbiddenException('Cannot change own role');
    return this.usersService.updateRole(id, role);
  }
}
