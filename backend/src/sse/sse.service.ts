import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { Request } from 'express';
import { DiagnosticEvent } from '../events/events.repository';

@Injectable()
export class SseService {
  private readonly subject = new Subject<DiagnosticEvent>();

  emit(event: DiagnosticEvent) {
    this.subject.next(event);
  }

  subscribe(_req: Request): Observable<MessageEvent> {
    return new Observable((observer) => {
      const sub = this.subject.subscribe({
        next: (event) => observer.next({ data: event } as MessageEvent),
        error: (err) => observer.error(err),
      });
      return () => sub.unsubscribe();
    });
  }
}
