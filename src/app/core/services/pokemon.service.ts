import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { Pokemon, PokemonComparison } from '../models';

@Injectable({
  providedIn: 'root'
})
export class PokemonService {
  private http = inject(HttpClient);
  private config = inject(ConfigService);

  private get apiUrl(): string {
    return `${this.config.apiUrl}/pokemons`;
  }

  getAll(): Observable<Pokemon[]> {
    return this.http.get<Pokemon[]>(this.apiUrl, { withCredentials: true });
  }

  getById(id: number): Observable<Pokemon> {
    return this.http.get<Pokemon>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  create(pokemon: Partial<Pokemon>): Observable<Pokemon> {
    return this.http.post<Pokemon>(this.apiUrl, pokemon, { withCredentials: true });
  }

  update(id: number, pokemon: Partial<Pokemon>): Observable<Pokemon> {
    return this.http.put<Pokemon>(`${this.apiUrl}/${id}`, pokemon, { withCredentials: true });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  compare(pokemonIds: number[]): Observable<PokemonComparison> {
    return this.http.post<PokemonComparison>(`${this.apiUrl}/compare`, pokemonIds, { 
      withCredentials: true 
    });
  }
}
