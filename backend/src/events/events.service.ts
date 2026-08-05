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

  getStatsByCode(limit?: number, from?: string, to?: string) {
    return this.repo.statsByCode(limit, from, to);
  }

  getCriticalVehicles() {
    return this.repo.criticalVehicles();
  }

  getEventContext(vehicleId: string, code: string) {
    return this.repo.eventContext(vehicleId, code);
  }

  ingestRaw(raw: string) {
    const { events, errors } = this.parser.parseLines(raw);
    if (events.length) this.repo.insertMany(events);
    return { ingested: events.length, failed: errors.length, failedLines: errors };
  }
}
