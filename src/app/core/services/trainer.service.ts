import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { Trainer, TrainerStats } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TrainerService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  private get apiUrl(): string {
    return `${this.config.apiUrl}/trainers`;
  }

  getAll(): Observable<Trainer[]> {
    return this.http.get<Trainer[]>(this.apiUrl, { withCredentials: true });
  }

  getById(id: number): Observable<Trainer> {
    return this.http.get<Trainer>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  create(trainer: Partial<Trainer>): Observable<Trainer> {
    return this.http.post<Trainer>(this.apiUrl, trainer, { withCredentials: true });
  }

  update(id: number, trainer: Partial<Trainer>): Observable<Trainer> {
    return this.http.put<Trainer>(`${this.apiUrl}/${id}`, trainer, { withCredentials: true });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  getStats(id: number): Observable<TrainerStats> {
    return this.http.get<TrainerStats>(`${this.apiUrl}/${id}/stats`, { withCredentials: true });
  }
}
