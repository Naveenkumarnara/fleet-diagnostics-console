import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Database from 'better-sqlite3';
import * as path from 'path';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private db: Database.Database;

  onModuleInit() {
    const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), 'fleet.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
  }

  onModuleDestroy() {
    this.db?.close();
  }

  get connection(): Database.Database {
    return this.db;
  }

  private migrate() {
    this.db.exec(`
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
