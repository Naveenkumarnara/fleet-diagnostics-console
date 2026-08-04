import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { ParsedEvent } from '../parser/parser.service';

export interface DiagnosticEvent {
  id: number;
  timestamp: string;
  vehicleId: string;
  level: 'ERROR' | 'WARN' | 'INFO';
  code: string;
  message: string;
  subsystem: string | null;
  mileage: number | null;
}

// Maps DTO field names to actual column names — whitelist prevents injection
const SORT_COLUMN: Record<string, string> = {
  timestamp: 'timestamp',
  vehicleId: 'vehicle_id',
  level:     'level',
  code:      'code',
};

export interface EventFilters {
  vehicleIds?: string[];
  code?: string;
  level?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
}

export interface VehicleStats {
  vehicleId: string;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  total: number;
}

export interface CodeStats {
  code: string;
  count: number;
  level: string;
}

@Injectable()
export class EventsRepository {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  insert(event: ParsedEvent): number {
    const result = this.db.connection.prepare(`
      INSERT INTO diagnostic_events (timestamp, vehicle_id, level, code, message, subsystem, mileage)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.timestamp.toISOString(),
      event.vehicleId,
      event.level,
      event.code,
      event.message,
      event.subsystem ?? null,
      null,
    );
    return Number(result.lastInsertRowid);
  }

  insertMany(events: ParsedEvent[]): void {
    const insert = this.db.connection.prepare(`
      INSERT INTO diagnostic_events (timestamp, vehicle_id, level, code, message, subsystem, mileage)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const tx = this.db.connection.transaction((evts: ParsedEvent[]) => {
      for (const e of evts) {
        insert.run(e.timestamp.toISOString(), e.vehicleId, e.level, e.code, e.message, e.subsystem ?? null, null);
      }
    });
    tx(events);
  }

  findMany(filters: EventFilters): { data: DiagnosticEvent[]; total: number } {
    const { where, params } = this.buildWhere(filters);
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    const countRow = this.db.connection
      .prepare(`SELECT COUNT(*) as cnt FROM diagnostic_events${where}`)
      .get(...params) as { cnt: number };

    const col = SORT_COLUMN[filters.sortField ?? 'timestamp'] ?? 'timestamp';
    const dir = filters.sortDir === 'asc' ? 'ASC' : 'DESC';

    const rows = this.db.connection
      .prepare(
        `SELECT id, timestamp, vehicle_id as vehicleId, level, code, message, subsystem, mileage
         FROM diagnostic_events${where}
         ORDER BY ${col} ${dir}
         LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset) as DiagnosticEvent[];

    return { data: rows, total: countRow.cnt };
  }

  statsByVehicle(from?: string, to?: string): VehicleStats[] {
    const conds: string[] = [];
    const params: (string | number)[] = [];
    if (from) { conds.push('timestamp >= ?'); params.push(from); }
    if (to)   { conds.push('timestamp <= ?'); params.push(to); }
    const where = conds.length ? ' WHERE ' + conds.join(' AND ') : '';

    return (this.db.connection.prepare(`
      SELECT
        vehicle_id as vehicleId,
        SUM(CASE WHEN level='ERROR' THEN 1 ELSE 0 END) as errorCount,
        SUM(CASE WHEN level='WARN'  THEN 1 ELSE 0 END) as warnCount,
        SUM(CASE WHEN level='INFO'  THEN 1 ELSE 0 END) as infoCount,
        COUNT(*) as total
      FROM diagnostic_events${where}
      GROUP BY vehicle_id
      ORDER BY errorCount DESC
    `).all(...params) as VehicleStats[]);
  }

  statsByCode(limit = 20, from?: string, to?: string): CodeStats[] {
    const conds: string[] = [];
    const params: (string | number)[] = [];
    if (from) { conds.push('timestamp >= ?'); params.push(from); }
    if (to)   { conds.push('timestamp <= ?'); params.push(to); }
    const where = conds.length ? ' WHERE ' + conds.join(' AND ') : '';

    return this.db.connection.prepare(`
      SELECT code, COUNT(*) as count, level
      FROM diagnostic_events${where}
      GROUP BY code, level
      ORDER BY count DESC
      LIMIT ?
    `).all(...params, limit) as CodeStats[];
  }

  // "Critical" = vehicle with >= 3 ERROR events in the last 15 minutes.
  // Both thresholds are env-configurable.
  criticalVehicles(): { vehicleId: string; recentErrors: number; lastSeen: string }[] {
    const windowMinutes = this.config.get<number>('criticalWindowMinutes')!;
    const threshold     = this.config.get<number>('criticalErrorThreshold')!;
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

    return this.db.connection.prepare(`
      SELECT vehicle_id as vehicleId, COUNT(*) as recentErrors, MAX(timestamp) as lastSeen
      FROM diagnostic_events
      WHERE level = 'ERROR' AND timestamp >= ?
      GROUP BY vehicle_id
      HAVING recentErrors >= ?
      ORDER BY recentErrors DESC
    `).all(since, threshold) as { vehicleId: string; recentErrors: number; lastSeen: string }[];
  }

  private buildWhere(filters: EventFilters): { where: string; params: (string | number)[] } {
    const conds: string[] = [];
    const params: (string | number)[] = [];

    if (filters.vehicleIds?.length) {
      const placeholders = filters.vehicleIds.map(() => '?').join(',');
      conds.push(`vehicle_id IN (${placeholders})`);
      params.push(...filters.vehicleIds);
    }
    if (filters.code) { conds.push('code = ?'); params.push(filters.code); }
    if (filters.level) { conds.push('level = ?'); params.push(filters.level.toUpperCase()); }
    if (filters.from)  { conds.push('timestamp >= ?'); params.push(filters.from); }
    if (filters.to)    { conds.push('timestamp <= ?'); params.push(filters.to); }

    return {
      where: conds.length ? ' WHERE ' + conds.join(' AND ') : '',
      params,
    };
  }
}
