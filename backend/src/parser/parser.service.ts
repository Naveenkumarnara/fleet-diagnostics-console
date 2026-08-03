import { Injectable } from '@nestjs/common';

export type EventLevel = 'ERROR' | 'WARN' | 'INFO';

export interface ParsedEvent {
  timestamp: Date;
  vehicleId: string;
  level: EventLevel;
  code: string;
  message: string;
  subsystem?: string;
}

// [2025-07-24 14:21:08] [VEHICLE_ID:1234] [ERROR] [CODE:U0420] [Steering angle sensor malfunction]
const LINE_RE =
  /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] \[VEHICLE_ID:([^\]]+)\] \[(ERROR|WARN|INFO)\] \[CODE:([^\]]+)\] \[([^\]]+)\]$/;

const SUBSYSTEM_MAP: Record<string, string> = {
  U: 'Network/Communication',
  P: 'Powertrain',
  C: 'Chassis',
  B: 'Body',
  E: 'EV/Hybrid',
};

@Injectable()
export class ParserService {
  parseLine(line: string): ParsedEvent | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const m = LINE_RE.exec(trimmed);
    if (!m) return null;

    const [, ts, vehicleId, level, code, message] = m;
    const timestamp = new Date(ts.replace(' ', 'T') + 'Z');
    if (isNaN(timestamp.getTime())) return null;

    const subsystem = SUBSYSTEM_MAP[code.charAt(0).toUpperCase()];

    return {
      timestamp,
      vehicleId,
      level: level as EventLevel,
      code,
      message,
      subsystem,
    };
  }

  parseLines(raw: string): { events: ParsedEvent[]; errors: string[] } {
    const events: ParsedEvent[] = [];
    const errors: string[] = [];

    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      const parsed = this.parseLine(line);
      if (parsed) {
        events.push(parsed);
      } else {
        errors.push(line);
      }
    }

    return { events, errors };
  }
}
