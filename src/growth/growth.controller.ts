import { Controller, Post, Param, ParseIntPipe, Body, ValidationPipe, UseGuards} from '@nestjs/common';
import { GrowthService } from './growth.service';
import { CreateGrowthRecordDto } from './dto/CreateGrowthRecordDto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';

@Controller('growth')
export class GrowthController {
  constructor(private readonly growthService: GrowthService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('PEGAWAI', 'DOKTER', 'ADMIN')
  @Post(':childId/growth-records')
  async addGrowthRecord(
    @Param('childId', ParseIntPipe) childId: number,
    @Body(new ValidationPipe()) body: CreateGrowthRecordDto,
  ) {
    return this.growthService.recordGrowth(childId, body);
  }
}
