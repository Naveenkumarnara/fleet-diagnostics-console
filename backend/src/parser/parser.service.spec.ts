import { Test, TestingModule } from '@nestjs/testing';
import { ParserService } from './parser.service';

describe('ParserService', () => {
  let service: ParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParserService],
    }).compile();
    service = module.get(ParserService);
  });

  describe('parseLine', () => {
    it('parses a well-formed ERROR line', () => {
      const line = '[2025-07-24 14:21:08] [VEHICLE_ID:1234] [ERROR] [CODE:U0420] [Steering angle sensor malfunction]';
      const result = service.parseLine(line);
      expect(result).not.toBeNull();
      expect(result!.vehicleId).toBe('1234');
      expect(result!.level).toBe('ERROR');
      expect(result!.code).toBe('U0420');
      expect(result!.message).toBe('Steering angle sensor malfunction');
      expect(result!.subsystem).toBe('Network/Communication');
    });

    it('parses a WARN line', () => {
      const line = '[2025-07-24 14:21:10] [VEHICLE_ID:5678] [WARN] [CODE:P0300] [Random misfire detected]';
      const result = service.parseLine(line);
      expect(result!.level).toBe('WARN');
      expect(result!.subsystem).toBe('Powertrain');
    });

    it('parses an INFO line', () => {
      const line = '[2025-07-24 14:22:05] [VEHICLE_ID:1234] [INFO] [CODE:EVT01] [Diagnostic check completed]';
      const result = service.parseLine(line);
      expect(result!.level).toBe('INFO');
    });

    it('returns null for a malformed line', () => {
      expect(service.parseLine('not a valid log line')).toBeNull();
      expect(service.parseLine('')).toBeNull();
      expect(service.parseLine('[bad timestamp] [VEHICLE_ID:x] [ERROR] [CODE:P0] [msg]')).toBeNull();
    });

    it('maps subsystem correctly for all prefixes', () => {
      const cases = [
        { code: 'P0300', expected: 'Powertrain' },
        { code: 'C0034', expected: 'Chassis' },
        { code: 'B1234', expected: 'Body' },
        { code: 'E0101', expected: 'EV/Hybrid' },
        { code: 'U0100', expected: 'Network/Communication' },
      ];
      for (const { code, expected } of cases) {
        const line = `[2025-07-24 10:00:00] [VEHICLE_ID:X] [INFO] [CODE:${code}] [test]`;
        expect(service.parseLine(line)?.subsystem).toBe(expected);
      }
    });
  });

  describe('parseLines', () => {
    it('splits valid and invalid lines', () => {
      const raw = [
        '[2025-07-24 14:21:08] [VEHICLE_ID:1234] [ERROR] [CODE:U0420] [Steering angle sensor malfunction]',
        'this is garbage',
        '[2025-07-24 14:21:10] [VEHICLE_ID:5678] [WARN] [CODE:P0300] [Random misfire detected]',
      ].join('\n');

      const { events, errors } = service.parseLines(raw);
      expect(events).toHaveLength(2);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe('this is garbage');
    });

    it('skips blank lines without counting them as errors', () => {
      const raw = '\n\n[2025-07-24 14:21:08] [VEHICLE_ID:1234] [ERROR] [CODE:U0420] [msg]\n\n';
      const { events, errors } = service.parseLines(raw);
      expect(events).toHaveLength(1);
      expect(errors).toHaveLength(0);
    });
  });
});
