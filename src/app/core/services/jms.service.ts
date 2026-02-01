import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface TrainerCreationMessage {
  trainerId: number;
  trainerName: string;
  trainerEmail: string;
  registrationDate: string;
}

export interface CaptureMessage {
  trainerId: number;
  trainerName: string;
  pokemonId: number;
  pokemonName: string;
  captureDate: string;
}

export interface JmsStats {
  totalMessages: number;
  [key: string]: any;
}

export interface HealthStatus {
  status: string;
  service: string;
}

@Injectable({
  providedIn: 'root'
})
export class JmsService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  private get apiUrl(): string {
    return this.config.jmsApiUrl;
  }

  // Health
  getHealth(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>(`${this.apiUrl}/health`);
  }

  // Captures
  getAllCaptures(): Observable<CaptureMessage[]> {
    return this.http.get<CaptureMessage[]>(`${this.apiUrl}/captures`);
  }

  getRecentCaptures(limit: number = 10): Observable<CaptureMessage[]> {
    return this.http.get<CaptureMessage[]>(`${this.apiUrl}/captures/recent?limit=${limit}`);
  }

  getCaptureStats(): Observable<JmsStats> {
    return this.http.get<JmsStats>(`${this.apiUrl}/captures/stats`);
  }

  // Trainer Creations
  getAllCreations(): Observable<TrainerCreationMessage[]> {
    return this.http.get<TrainerCreationMessage[]>(`${this.apiUrl}/creations`);
  }

  getRecentCreations(limit: number = 10): Observable<TrainerCreationMessage[]> {
    return this.http.get<TrainerCreationMessage[]>(`${this.apiUrl}/creations/recent?limit=${limit}`);
  }

  getCreationStats(): Observable<JmsStats> {
    return this.http.get<JmsStats>(`${this.apiUrl}/creations/stats`);
  }

  // Aggregated Stats
  getAggregatedStats(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/aggregated/stats`);
  }

  getTrainerAggregatedStats(trainerId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/aggregated/stats/trainer/${trainerId}`);
  }
}
