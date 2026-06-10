import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { DEFAULT_REDIS_PORT, EMAIL_QUEUE } from './constants/queue.constants';
import { isEmailQueueEnabled } from './helpers/queue.helpers';

@Module({})
export class QueueModule {
  /**
   * Registers BullMQ (and the Redis connection) only when
   * `EMAIL_QUEUE_ENABLED=true`, so the app can run without Redis.
   */
  static register(): DynamicModule {
    if (!isEmailQueueEnabled()) {
      return { module: QueueModule };
    }

    return {
      module: QueueModule,
      global: true,
      imports: [
        BullModule.forRootAsync({
          useFactory: (configService: ConfigService) => ({
            connection: {
              host: configService.get<string>('REDIS_HOST') ?? 'localhost',
              port: parseInt(
                configService.get<string>('REDIS_PORT') ??
                  `${DEFAULT_REDIS_PORT}`,
                10,
              ),
            },
          }),
          inject: [ConfigService],
        }),
        BullModule.registerQueue({ name: EMAIL_QUEUE }),
      ],
      exports: [BullModule],
    };
  }
}
