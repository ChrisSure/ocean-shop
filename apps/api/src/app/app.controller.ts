import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/* v8 ignore next 3 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }
}
