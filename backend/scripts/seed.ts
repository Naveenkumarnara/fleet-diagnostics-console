/**
 * Standalone seed script — runs outside NestJS DI so it can be invoked directly.
 * Usage: npx ts-node scripts/seed.ts [days] [eventsPerDay]
 */
import Database from 'better-sqlite3';
import * as path from 'path';

const VEHICLE_IDS = [
  'V001','V002','V003','V004','V005',
  'V006','V007','V008','V009','V010',
  'V011','V012','V013','V014','V015',
];

const CODES: { code: string; level: string; message: string }[] = [
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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const days = parseInt(process.argv[2] ?? '7', 10);
const eventsPerDay = parseInt(process.argv[3] ?? '300', 10);

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), 'fleet.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
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
  CREATE INDEX IF NOT EXISTS idx_events_vehicle ON diagnostic_events(vehicle_id);
  CREATE INDEX IF NOT EXISTS idx_events_level   ON diagnostic_events(level);
  CREATE INDEX IF NOT EXISTS idx_events_code    ON diagnostic_events(code);
  CREATE INDEX IF NOT EXISTS idx_events_ts      ON diagnostic_events(timestamp);
`);

const insert = db.prepare(
  `INSERT INTO diagnostic_events (timestamp, vehicle_id, level, code, message, subsystem)
   VALUES (?, ?, ?, ?, ?, ?)`
);

const now = Date.now();
const events: { timestamp: string; vehicleId: string; level: string; code: string; message: string; subsystem: string | null }[] = [];

for (let d = 0; d < days; d++) {
  for (let i = 0; i < eventsPerDay; i++) {
    const offsetMs = (days - d) * 86_400_000 - Math.random() * 86_400_000;
    const timestamp = new Date(now - offsetMs).toISOString();
    const vehicleId = pick(VEHICLE_IDS);
    const def = pick(CODES);
    const subsystem = SUBSYSTEM_MAP[def.code.charAt(0).toUpperCase()] ?? null;
    events.push({ timestamp, vehicleId, level: def.level, code: def.code, message: def.message, subsystem });
  }
}

events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

const tx = db.transaction((rows: typeof events) => {
  for (const e of rows) {
    insert.run(e.timestamp, e.vehicleId, e.level, e.code, e.message, e.subsystem);
  }
});
tx(events);

console.log(`Seeded ${events.length} events (${days} days, ~${eventsPerDay}/day) into ${dbPath}`);
db.close();
