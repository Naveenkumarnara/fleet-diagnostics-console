import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  @ApiOperation({ summary: 'Service health check' })
  check() {
    let dbStatus: 'up' | 'down' = 'down';
    try {
      this.db.connection.prepare('SELECT 1').get();
      dbStatus = 'up';
    } catch {
      // db unreachable
    }
    return {
      status: dbStatus === 'up' ? 'ok' : 'degraded',
      db: dbStatus,
      uptime: Math.floor(process.uptime()),
    };
  }
}
