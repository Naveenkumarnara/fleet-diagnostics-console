import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ParserModule } from './parser/parser.module';
import { EventsModule } from './events/events.module';
import { SseModule } from './sse/sse.module';
import { IngestionModule } from './ingestion/ingestion.module';

@Module({
  imports: [
    DatabaseModule,
    ParserModule,
    SseModule,
    EventsModule,
    IngestionModule,
  ],
})
export class AppModule {}
