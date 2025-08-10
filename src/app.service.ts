import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getHealth() {
    const now = new Date();
    return {
      status: 'ok',
      time: now.toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
