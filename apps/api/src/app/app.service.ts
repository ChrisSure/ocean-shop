import { Injectable } from '@nestjs/common';

/* v8 ignore next 3 */
@Injectable()
export class AppService {
  getData(): { message: string } {
    return { message: 'Hello API' };
  }
}
