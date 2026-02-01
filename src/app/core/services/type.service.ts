import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { Type } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TypeService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  private get apiUrl(): string {
    return `${this.config.apiUrl}/types`;
  }

  getAll(): Observable<Type[]> {
    return this.http.get<Type[]>(this.apiUrl, { withCredentials: true });
  }

  getById(id: number): Observable<Type> {
    return this.http.get<Type>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  create(type: Partial<Type>): Observable<Type> {
    return this.http.post<Type>(this.apiUrl, type, { withCredentials: true });
  }

  update(id: number, type: Partial<Type>): Observable<Type> {
    return this.http.put<Type>(`${this.apiUrl}/${id}`, type, { withCredentials: true });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }
}
