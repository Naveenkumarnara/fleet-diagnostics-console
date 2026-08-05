import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  DiagnosticEvent,
  EventFilters,
  EventsResponse,
  VehicleStats,
  CodeStats,
  CriticalVehicle,
  EventContext,
} from '../models/event.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getEvents(filters: Partial<EventFilters>): Observable<EventsResponse> {
    let params = new HttpParams();
    if (filters.vehicleIds?.length) params = params.set('vehicleIds', filters.vehicleIds.join(','));
    if (filters.code)   params = params.set('code', filters.code);
    if (filters.level)  params = params.set('level', filters.level);
    if (filters.from)   params = params.set('from', filters.from);
    if (filters.to)     params = params.set('to', filters.to);
    if (filters.limit != null)  params = params.set('limit', filters.limit);
    if (filters.offset != null) params = params.set('offset', filters.offset);
    if (filters.sortField)      params = params.set('sortField', filters.sortField);
    if (filters.sortDir)        params = params.set('sortDir', filters.sortDir);
    return this.http.get<EventsResponse>(`${this.base}/events`, { params });
  }

  getStatsByVehicle(from?: string, to?: string): Observable<VehicleStats[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get<VehicleStats[]>(`${this.base}/events/stats/by-vehicle`, { params });
  }

  getStatsByCode(from?: string, to?: string): Observable<CodeStats[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get<CodeStats[]>(`${this.base}/events/stats/by-code`, { params });
  }

  getCritical(): Observable<CriticalVehicle[]> {
    return this.http.get<CriticalVehicle[]>(`${this.base}/events/critical`);
  }

  getEventContext(vehicleId: string, code: string): Observable<EventContext> {
    const params = new HttpParams().set('vehicleId', vehicleId).set('code', code);
    return this.http.get<EventContext>(`${this.base}/events/context`, { params });
  }

  // Returns an EventSource-backed observable that emits raw DiagnosticEvent objects
  getLiveStream(): Observable<DiagnosticEvent> {
    return new Observable((observer) => {
      const source = new EventSource(`${this.base}/events/stream`);
      source.onmessage = (e) => {
        try {
          observer.next(JSON.parse(e.data) as DiagnosticEvent);
        } catch {
          // malformed SSE data — ignore
        }
      };
      source.onerror = () => {
        // SSE auto-reconnects on error; just log
        console.warn('SSE connection error, browser will retry');
      };
      return () => source.close();
    });
  }
}
