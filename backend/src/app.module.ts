import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import appConfig from './config/app.config';
import { DatabaseModule } from './database/database.module';
import { ParserModule } from './parser/parser.module';
import { EventsModule } from './events/events.module';
import { SseModule } from './sse/sse.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig],
      isGlobal: true,
      validationSchema: Joi.object({
        PORT:                    Joi.number().default(3000),
        DB_PATH:                 Joi.string().optional(),
        CORS_ORIGIN:             Joi.string().default('http://localhost:4200'),
        LIVE_INTERVAL_MS:        Joi.number().min(500).default(4000),
        CRITICAL_WINDOW_MINUTES: Joi.number().min(1).default(15),
        CRITICAL_ERROR_THRESHOLD:Joi.number().min(1).default(3),
      }),
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    DatabaseModule,
    ParserModule,
    SseModule,
    EventsModule,
    IngestionModule,
    HealthModule,
  ],
})
export class AppModule {}
