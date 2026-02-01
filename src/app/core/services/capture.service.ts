import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { CaughtPokemon, CaptureRequest, CaptureMessage, AggregatedStats } from '../models';

@Injectable({
  providedIn: 'root'
})
export class CaptureService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  private get apiUrl(): string {
    return `${this.config.apiUrl}/caught-pokemons`;
  }

  private get jmsApiUrl(): string {
    return this.config.jmsApiUrl;
  }

  // Main API endpoints
  getAll(): Observable<CaughtPokemon[]> {
    return this.http.get<CaughtPokemon[]>(this.apiUrl, { withCredentials: true });
  }

  getById(id: number): Observable<CaughtPokemon> {
    return this.http.get<CaughtPokemon>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  getByTrainer(trainerId: number): Observable<CaughtPokemon[]> {
    return this.http.get<CaughtPokemon[]>(`${this.apiUrl}/trainer/${trainerId}`, { 
      withCredentials: true 
    });
  }

  getByPokemon(pokemonId: number): Observable<CaughtPokemon[]> {
    return this.http.get<CaughtPokemon[]>(`${this.apiUrl}/pokemon/${pokemonId}`, { 
      withCredentials: true 
    });
  }

  capture(request: CaptureRequest): Observable<CaughtPokemon> {
    return this.http.post<CaughtPokemon>(this.apiUrl, request, { withCredentials: true });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  // JMS Consumer API endpoints
  getAllCaptureMessages(): Observable<CaptureMessage[]> {
    return this.http.get<CaptureMessage[]>(`${this.jmsApiUrl}/captures`);
  }

  getRecentCaptures(limit: number = 10): Observable<CaptureMessage[]> {
    return this.http.get<CaptureMessage[]>(`${this.jmsApiUrl}/captures/recent?limit=${limit}`);
  }

  getCaptureStats(): Observable<any> {
    return this.http.get<any>(`${this.jmsApiUrl}/captures/stats`);
  }

  getAggregatedStats(): Observable<AggregatedStats[]> {
    return this.http.get<AggregatedStats[]>(`${this.jmsApiUrl}/aggregated/stats`);
  }

  getTrainerAggregatedStats(trainerId: number): Observable<AggregatedStats> {
    return this.http.get<AggregatedStats>(`${this.jmsApiUrl}/aggregated/stats/trainer/${trainerId}`);
  }
}
