import { Controller, Post, Param, ParseIntPipe, Body, ValidationPipe, UseGuards, Get } from '@nestjs/common';
import { GrowthService } from './growth.service';
import { CreateGrowthRecordDto } from './dto/CreateGrowthRecordDto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('growth')
export class GrowthController {
  constructor(private readonly growthService: GrowthService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getGrowthRecords(
    @Param('childId', ParseIntPipe) childId: number,
    @CurrentUser() user: any,
  ) {
    return this.growthService.getGrowthRecords(childId, user);
  }

  @Get(':childId/growth-chart')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getGrowthChart(
    @Param('childId', ParseIntPipe) childId: number,
    @CurrentUser() user: any,
  ) {
    return this.growthService.getGrowthChartData(childId, user);
  }

  @Get(':childId/weight-chart')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getWeightChart(
    @Param('childId', ParseIntPipe) childId: number,
    @CurrentUser() user: any,
  ) {
    return this.growthService.getWeightChartData(childId, user);
  }

  @Get(':childId/growth-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getGrowthStats(
    @Param('childId', ParseIntPipe) childId: number,
    @CurrentUser() user: any,
  ) {
    return this.growthService.getGrowthStats(childId, user);
  }
}
