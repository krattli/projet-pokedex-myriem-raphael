import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AppConfig {
  apiUrl: string;
  jmsApiUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: AppConfig | null = null;

  constructor(private http: HttpClient) {}

  async loadConfig(): Promise<void> {
    try {
      this.config = await firstValueFrom(
        this.http.get<AppConfig>('/assets/config.json')
      );
    } catch (error) {
      // Fallback to default values
      this.config = {
        apiUrl: 'http://localhost:8080/api',
        jmsApiUrl: 'http://localhost:8081/api'
      };
      console.warn('Could not load config.json, using defaults', error);
    }
  }

  get apiUrl(): string {
    return this.config?.apiUrl ?? 'http://localhost:8080/api';
  }

  get jmsApiUrl(): string {
    return this.config?.jmsApiUrl ?? 'http://localhost:8081/api';
  }
}
