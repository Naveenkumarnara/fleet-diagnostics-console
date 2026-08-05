import * as path from 'path';

export default () => ({
  port:                   parseInt(process.env.PORT ?? '3000', 10),
  dbPath:                 process.env.DB_PATH ?? path.join(process.cwd(), 'fleet.db'),
  corsOrigin:             process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  liveIntervalMs:         parseInt(process.env.LIVE_INTERVAL_MS ?? '4000', 10),
  criticalWindowMinutes:  parseInt(process.env.CRITICAL_WINDOW_MINUTES ?? '15', 10),
  criticalErrorThreshold: parseInt(process.env.CRITICAL_ERROR_THRESHOLD ?? '3', 10),
  throttleTtl:            parseInt(process.env.THROTTLE_TTL ?? '60', 10),   // seconds
  throttleLimit:          parseInt(process.env.THROTTLE_LIMIT ?? '120', 10), // requests per TTL
});
