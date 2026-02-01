import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { ConfigService } from './config.service';
import { Trainer, LoginRequest, RegisterRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);
  
  private currentTrainerSignal = signal<Trainer | null>(null);
  
  readonly currentTrainer = this.currentTrainerSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.currentTrainerSignal() !== null);

  constructor() {
    this.loadStoredTrainer();
  }

  private get apiUrl(): string {
    return `${this.config.apiUrl}/auth`;
  }

  private loadStoredTrainer(): void {
    const stored = localStorage.getItem('currentTrainer');
    if (stored) {
      try {
        this.currentTrainerSignal.set(JSON.parse(stored));
      } catch {
        localStorage.removeItem('currentTrainer');
      }
    }
  }

  private storeTrainer(trainer: Trainer): void {
    localStorage.setItem('currentTrainer', JSON.stringify(trainer));
    this.currentTrainerSignal.set(trainer);
  }

  register(request: RegisterRequest): Observable<Trainer> {
    return this.http.post<Trainer>(`${this.apiUrl}/register`, request, { 
      withCredentials: true 
    }).pipe(
      tap(trainer => this.storeTrainer(trainer))
    );
  }

  login(request: LoginRequest): Observable<Trainer> {
    return this.http.post<Trainer>(`${this.apiUrl}/login`, request, { 
      withCredentials: true 
    }).pipe(
      tap(trainer => this.storeTrainer(trainer))
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/logout`, {}, { 
      withCredentials: true 
    }).pipe(
      tap(() => {
        localStorage.removeItem('currentTrainer');
        this.currentTrainerSignal.set(null);
      }),
      catchError(() => {
        localStorage.removeItem('currentTrainer');
        this.currentTrainerSignal.set(null);
        return of(undefined);
      })
    );
  }

  getTrainerId(): number | null {
    const trainer = this.currentTrainerSignal();
    return trainer?.trainerId ?? trainer?.id ?? null;
  }
}
