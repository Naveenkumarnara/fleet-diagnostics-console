import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private db: DatabaseSync;

  onModuleInit() {
    const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), 'fleet.db');
    this.db = new DatabaseSync(dbPath);
    this.migrate();
  }

  onModuleDestroy() {
    this.db?.close();
  }

  get connection(): DatabaseSync {
    return this.db;
  }

  private migrate() {
    this.db.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA foreign_keys=ON;

      CREATE TABLE IF NOT EXISTS diagnostic_events (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp   TEXT    NOT NULL,
        vehicle_id  TEXT    NOT NULL,
        level       TEXT    NOT NULL CHECK(level IN ('ERROR','WARN','INFO')),
        code        TEXT    NOT NULL,
        message     TEXT    NOT NULL,
        subsystem   TEXT,
        mileage     INTEGER,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_events_vehicle  ON diagnostic_events(vehicle_id);
      CREATE INDEX IF NOT EXISTS idx_events_level    ON diagnostic_events(level);
      CREATE INDEX IF NOT EXISTS idx_events_code     ON diagnostic_events(code);
      CREATE INDEX IF NOT EXISTS idx_events_ts       ON diagnostic_events(timestamp);
    `);
  }
}
