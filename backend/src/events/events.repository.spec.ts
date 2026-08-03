import { Test, TestingModule } from '@nestjs/testing';
import Database from 'better-sqlite3';
import { DatabaseService } from '../database/database.service';
import { EventsRepository } from './events.repository';

class TestDatabaseService {
  private db: Database.Database;

  onModuleInit() {
    this.db = new Database(':memory:');
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE diagnostic_events (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp   TEXT    NOT NULL,
        vehicle_id  TEXT    NOT NULL,
        level       TEXT    NOT NULL,
        code        TEXT    NOT NULL,
        message     TEXT    NOT NULL,
        subsystem   TEXT,
        mileage     INTEGER,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  get connection() { return this.db; }
}

describe('EventsRepository', () => {
  let repo: EventsRepository;
  let dbService: TestDatabaseService;

  beforeEach(async () => {
    dbService = new TestDatabaseService();
    dbService.onModuleInit();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsRepository,
        { provide: DatabaseService, useValue: dbService },
      ],
    }).compile();

    repo = module.get(EventsRepository);
  });

  const makeEvent = (overrides: Partial<any> = {}) => ({
    timestamp: new Date('2025-07-24T14:00:00Z'),
    vehicleId: 'V001',
    level: 'ERROR' as const,
    code: 'P0300',
    message: 'Misfire',
    subsystem: 'Powertrain',
    ...overrides,
  });

  it('inserts and retrieves an event', () => {
    repo.insert(makeEvent());
    const { data, total } = repo.findMany({});
    expect(total).toBe(1);
    expect(data[0].vehicleId).toBe('V001');
  });

  it('filters by vehicleId', () => {
    repo.insertMany([
      makeEvent({ vehicleId: 'V001' }),
      makeEvent({ vehicleId: 'V002' }),
    ]);
    const { data } = repo.findMany({ vehicleIds: ['V001'] });
    expect(data).toHaveLength(1);
    expect(data[0].vehicleId).toBe('V001');
  });

  it('filters by level', () => {
    repo.insertMany([
      makeEvent({ level: 'ERROR' }),
      makeEvent({ level: 'WARN' }),
      makeEvent({ level: 'INFO' }),
    ]);
    const { data } = repo.findMany({ level: 'WARN' });
    expect(data).toHaveLength(1);
  });

  it('filters by time range', () => {
    repo.insertMany([
      makeEvent({ timestamp: new Date('2025-07-24T10:00:00Z') }),
      makeEvent({ timestamp: new Date('2025-07-24T12:00:00Z') }),
      makeEvent({ timestamp: new Date('2025-07-24T15:00:00Z') }),
    ]);
    const { data } = repo.findMany({
      from: '2025-07-24T11:00:00.000Z',
      to:   '2025-07-24T13:00:00.000Z',
    });
    expect(data).toHaveLength(1);
  });

  it('paginates correctly', () => {
    repo.insertMany(Array.from({ length: 10 }, (_, i) =>
      makeEvent({ vehicleId: `V0${String(i).padStart(2, '0')}` })
    ));
    const page1 = repo.findMany({ limit: 3, offset: 0 });
    const page2 = repo.findMany({ limit: 3, offset: 3 });
    expect(page1.data).toHaveLength(3);
    expect(page2.data).toHaveLength(3);
    expect(page1.total).toBe(10);
  });

  it('statsByVehicle aggregates counts by level', () => {
    repo.insertMany([
      makeEvent({ vehicleId: 'V001', level: 'ERROR' }),
      makeEvent({ vehicleId: 'V001', level: 'ERROR' }),
      makeEvent({ vehicleId: 'V001', level: 'WARN' }),
      makeEvent({ vehicleId: 'V002', level: 'INFO' }),
    ]);
    const stats = repo.statsByVehicle();
    const v1 = stats.find((s) => s.vehicleId === 'V001');
    expect(v1?.errorCount).toBe(2);
    expect(v1?.warnCount).toBe(1);
  });

  it('criticalVehicles returns vehicles exceeding error threshold', () => {
    process.env.CRITICAL_ERROR_THRESHOLD = '3';
    process.env.CRITICAL_WINDOW_MINUTES = '15';

    for (let i = 0; i < 5; i++) {
      repo.insert({ ...makeEvent(), timestamp: new Date(Date.now() - i * 10_000) });
    }

    const critical = repo.criticalVehicles();
    expect(critical.length).toBeGreaterThanOrEqual(1);
    expect(critical[0].vehicleId).toBe('V001');
    expect(critical[0].recentErrors).toBeGreaterThanOrEqual(3);
  });
});
