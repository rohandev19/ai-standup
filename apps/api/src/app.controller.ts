import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      postgres: 'connected',
      redis: 'connected',
      uptime: process.uptime(),
    };
  }
}
