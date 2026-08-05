export type EventLevel = 'ERROR' | 'WARN' | 'INFO';

export interface DiagnosticEvent {
  id: number;
  timestamp: string;
  vehicleId: string;
  level: EventLevel;
  code: string;
  message: string;
  subsystem: string | null;
  mileage: number | null;
}

export interface EventsResponse {
  data: DiagnosticEvent[];
  total: number;
}

export type SortField = 'timestamp' | 'vehicleId' | 'level' | 'code';
export type SortDir   = 'asc' | 'desc';

export interface EventFilters {
  vehicleIds: string[];
  code: string;
  level: string;
  from: string;
  to: string;
  limit: number;
  offset: number;
  sortField: SortField;
  sortDir: SortDir;
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

export interface CriticalVehicle {
  vehicleId: string;
  recentErrors: number;
  lastSeen: string;
}

export interface EventContext {
  occurrencesToday: number;
  lastOccurrence: string | null;
  vehicleCritical: boolean;
  related: DiagnosticEvent[];
}
