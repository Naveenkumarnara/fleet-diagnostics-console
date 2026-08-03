import {
  Controller,
  Get,
  Query,
  ValidationPipe,
  Sse,
  MessageEvent,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import type { Request } from 'express';
import { EventsService } from './events.service';
import { SseService } from '../sse/sse.service';
import { QueryEventsDto } from './dto/query-events.dto';
import { StatsQueryDto } from './dto/stats-query.dto';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly sseService: SseService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List diagnostic events with optional filters' })
  getEvents(@Query(new ValidationPipe({ transform: true })) query: QueryEventsDto) {
    const { vehicleIds, code, level, from, to, limit, offset } = query;
    return this.eventsService.getEvents({ vehicleIds, code, level, from, to, limit, offset });
  }

  @Get('stats/by-vehicle')
  @ApiOperation({ summary: 'Event counts grouped by vehicle' })
  statsByVehicle(@Query(new ValidationPipe({ transform: true })) query: StatsQueryDto) {
    return this.eventsService.getStatsByVehicle(query.from, query.to);
  }

  @Get('stats/by-code')
  @ApiOperation({ summary: 'Most frequent error codes' })
  statsByCode(@Query(new ValidationPipe({ transform: true })) query: StatsQueryDto) {
    return this.eventsService.getStatsByCode(query.limit);
  }

  @Get('critical')
  @ApiOperation({ summary: 'Vehicles currently in critical state' })
  @ApiResponse({ status: 200, description: 'Vehicles with >= N errors in the last X minutes' })
  critical() {
    return this.eventsService.getCriticalVehicles();
  }

  @Sse('stream')
  @ApiOperation({ summary: 'SSE stream of live diagnostic events' })
  stream(@Req() req: Request): Observable<MessageEvent> {
    return this.sseService.subscribe(req);
  }
}
