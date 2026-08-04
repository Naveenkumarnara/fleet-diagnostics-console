import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import { DatabaseModule } from './database/database.module';
import { ParserModule } from './parser/parser.module';
import { EventsModule } from './events/events.module';
import { SseModule } from './sse/sse.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ load: [appConfig], isGlobal: true }),
    DatabaseModule,
    ParserModule,
    SseModule,
    EventsModule,
    IngestionModule,
    HealthModule,
  ],
})
export class AppModule {}
