import { Controller, Post, Param, ParseIntPipe, Body, ValidationPipe} from '@nestjs/common';
import { GrowthService } from './growth.service';
import { CreateGrowthRecordDto } from './dto/CreateGrowthRecordDto';

@Controller('growth')
export class GrowthController {
  constructor(private readonly growthService: GrowthService) {}

  @Post(':childId/growth-records')
  async addGrowthRecord(
    @Param('childId', ParseIntPipe) childId: number,
    @Body(new ValidationPipe()) body: CreateGrowthRecordDto,
  ) {
    return this.growthService.recordGrowth(childId, body);
  }
}
