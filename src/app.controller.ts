import { Controller, Get, Header } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  rootHealth() {
    return this.appService.getHealth();
  }

  @Get('health')
  @Header('Cache-Control', 'no-store')
  health() {
    return this.appService.getHealth();
  }
}
