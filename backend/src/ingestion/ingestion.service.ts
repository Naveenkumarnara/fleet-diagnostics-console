import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventsRepository } from '../events/events.repository';
import { SseService } from '../sse/sse.service';
import { ParserService } from '../parser/parser.service';

const VEHICLE_IDS = ['V001','V002','V003','V004','V005','V006','V007','V008','V009','V010',
  'V011','V012','V013','V014','V015'];

const CODES: { code: string; level: 'ERROR'|'WARN'|'INFO'; message: string }[] = [
  { code: 'P0300', level: 'ERROR', message: 'Random/multiple cylinder misfire' },
  { code: 'P0420', level: 'WARN',  message: 'Catalyst system efficiency below threshold' },
  { code: 'U0420', level: 'ERROR', message: 'Steering angle sensor malfunction' },
  { code: 'U0100', level: 'ERROR', message: 'Lost communication with ECM/PCM' },
  { code: 'C0034', level: 'ERROR', message: 'Right front wheel speed sensor fault' },
  { code: 'B1234', level: 'WARN',  message: 'Driver door module communication error' },
  { code: 'P0172', level: 'WARN',  message: 'System too rich (bank 1)' },
  { code: 'E0101', level: 'WARN',  message: 'HV battery cell voltage imbalance' },
  { code: 'E0202', level: 'ERROR', message: 'Charging system fault — overcurrent' },
  { code: 'EVT01', level: 'INFO',  message: 'Diagnostic check completed' },
  { code: 'EVT02', level: 'INFO',  message: 'OTA update downloaded' },
  { code: 'EVT03', level: 'INFO',  message: 'Vehicle connected to fleet network' },
  { code: 'P0562', level: 'WARN',  message: 'System voltage low' },
  { code: 'C0045', level: 'ERROR', message: 'Left rear ABS solenoid circuit fault' },
  { code: 'U0140', level: 'ERROR', message: 'Lost communication with BCM' },
];

const SUBSYSTEM_MAP: Record<string, string> = {
  U: 'Network/Communication',
  P: 'Powertrain',
  C: 'Chassis',
  B: 'Body',
  E: 'EV/Hybrid',
};

@Injectable()
export class IngestionService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(IngestionService.name);
  private liveTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly repo: EventsRepository,
    private readonly sse: SseService,
    private readonly parser: ParserService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap() {
    this.startLiveStream();
  }

  onApplicationShutdown() {
    if (this.liveTimer) clearInterval(this.liveTimer);
  }

  private startLiveStream() {
    const intervalMs = this.config.get<number>('liveIntervalMs')!;
    this.liveTimer = setInterval(() => {
      const event = this.generateEvent(new Date());
      const id = this.repo.insert(event);
      this.sse.emit({ id, timestamp: event.timestamp.toISOString(), vehicleId: event.vehicleId, level: event.level, code: event.code, message: event.message, subsystem: event.subsystem ?? null, mileage: null });
    }, intervalMs);
    this.logger.log(`Live event stream started (interval: ${intervalMs}ms)`);
  }

  seed(days = 7, eventsPerDay = 300) {
    const now = Date.now();
    const events = [];

    for (let d = 0; d < days; d++) {
      for (let i = 0; i < eventsPerDay; i++) {
        const offsetMs = (days - d) * 86_400_000 - Math.random() * 86_400_000;
        const timestamp = new Date(now - offsetMs);
        events.push(this.generateEvent(timestamp));
      }
    }

    // Sort chronologically before insert so timestamps look natural in the DB
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    this.repo.insertMany(events);
    return events.length;
  }

  private generateEvent(timestamp: Date) {
    const vehicleId = VEHICLE_IDS[Math.floor(Math.random() * VEHICLE_IDS.length)];
    const def = CODES[Math.floor(Math.random() * CODES.length)];
    const subsystem = SUBSYSTEM_MAP[def.code.charAt(0).toUpperCase()];
    return { timestamp, vehicleId, level: def.level, code: def.code, message: def.message, subsystem };
  }
}
