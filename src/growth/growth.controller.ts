import { Controller, Post, Param, ParseIntPipe, Body, ValidationPipe, UseGuards, Get } from '@nestjs/common';
import { GrowthService } from './growth.service';
import { CreateGrowthRecordDto } from './dto/CreateGrowthRecordDto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('growth')
export class GrowthController {
  constructor(private readonly growthService: GrowthService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('PEGAWAI', 'DOKTER', 'ADMIN')
  @Post(':childId/growth-records')
  async addGrowthRecord(
    @Param('childId', ParseIntPipe) childId: number,
  @Body(new ValidationPipe()) body: CreateGrowthRecordDto,
  @CurrentUser() user: any,
  ) {
  return this.growthService.recordGrowth(childId, { ...body, inputBy: user.id });
  }

  @Get(':childId/growth-records')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async getGrowthRecords(
    @Param('childId', ParseIntPipe) childId: number,
    @CurrentUser() user: any,
  ) {
    return this.growthService.getGrowthRecords(childId, user);
  }
}
