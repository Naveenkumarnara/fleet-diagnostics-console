import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { EventsModule } from '../events/events.module';
import { SseModule } from '../sse/sse.module';
import { ParserModule } from '../parser/parser.module';

@Module({
  imports: [EventsModule, SseModule, ParserModule],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
