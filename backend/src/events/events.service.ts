import { Injectable } from '@nestjs/common';
import { EventsRepository, EventFilters } from './events.repository';
import { ParserService } from '../parser/parser.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly repo: EventsRepository,
    private readonly parser: ParserService,
  ) {}

  getEvents(filters: EventFilters) {
    return this.repo.findMany(filters);
  }

  getStatsByVehicle(from?: string, to?: string) {
    return this.repo.statsByVehicle(from, to);
  }

  getStatsByCode(limit?: number) {
    return this.repo.statsByCode(limit);
  }

  getCriticalVehicles() {
    return this.repo.criticalVehicles();
  }

  ingestRaw(raw: string) {
    const { events, errors } = this.parser.parseLines(raw);
    if (events.length) this.repo.insertMany(events);
    return { ingested: events.length, failed: errors.length, failedLines: errors };
  }
}
