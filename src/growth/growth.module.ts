import { Module } from '@nestjs/common';
import { GrowthService } from './growth.service';
import { GrowthController } from './growth.controller';

@Module({
  controllers: [GrowthController],
  providers: [GrowthService],
})
export class GrowthModule {}
