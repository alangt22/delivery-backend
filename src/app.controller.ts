import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  // Verifica se a API está online.
  @Get()
  getStatus() {
    return {
      message: 'Delivery API is running',
    };
  }
}