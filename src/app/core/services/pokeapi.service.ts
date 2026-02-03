import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

export interface PokeApiPokemon {
  id: number;
  name: string;
  height: number; // décimètres
  weight: number; // hectogrammes
  base_experience: number;
  types: PokeApiType[];
  stats: PokeApiStat[];
  abilities: PokeApiAbility[];
  sprites: {
    front_default: string;
    other?: {
      'official-artwork'?: {
        front_default: string;
      };
    };
  };
}

export interface PokeApiType {
  slot: number;
  type: {
    name: string;
    url: string;
  };
}

export interface PokeApiStat {
  base_stat: number;
  effort: number;
  stat: {
    name: string;
    url: string;
  };
}

export interface PokeApiAbility {
  ability: {
    name: string;
    url: string;
  };
  is_hidden: boolean;
  slot: number;
}

export interface PokemonExtraData {
  height: number; // en mètres
  weight: number; // en kg
  types: string[];
  baseExperience: number;
  abilities: { name: string; isHidden: boolean }[];
}

@Injectable({
  providedIn: 'root'
})
export class PokeApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'https://pokeapi.co/api/v2';
  
  // Cache pour éviter les appels répétés
  private cache = new Map<number, PokemonExtraData>();

  getPokemonData(pokedexNumber: number): Observable<PokemonExtraData | null> {
    // Vérifier le cache
    if (this.cache.has(pokedexNumber)) {
      return of(this.cache.get(pokedexNumber)!);
    }

    return this.http.get<PokeApiPokemon>(`${this.baseUrl}/pokemon/${pokedexNumber}`).pipe(
      map(data => {
        const extraData: PokemonExtraData = {
          height: data.height / 10, // Convertir décimètres en mètres
          weight: data.weight / 10, // Convertir hectogrammes en kg
          types: data.types
            .sort((a, b) => a.slot - b.slot)
            .map(t => this.capitalizeTypeName(t.type.name)),
          baseExperience: data.base_experience,
          abilities: data.abilities
            .sort((a, b) => a.slot - b.slot)
            .map(a => ({
              name: this.formatAbilityName(a.ability.name),
              isHidden: a.is_hidden
            }))
        };
        
        // Mettre en cache
        this.cache.set(pokedexNumber, extraData);
        
        return extraData;
      }),
      catchError(err => {
        console.error(`Erreur lors de la récupération des données PokéAPI pour #${pokedexNumber}:`, err);
        return of(null);
      })
    );
  }

  private capitalizeTypeName(name: string): string {
    // Mapping des noms anglais vers français pour Pokémon Showdown
    const typeMap: Record<string, string> = {
      'normal': 'Normal',
      'fire': 'Fire',
      'water': 'Water',
      'electric': 'Electric',
      'grass': 'Grass',
      'ice': 'Ice',
      'fighting': 'Fighting',
      'poison': 'Poison',
      'ground': 'Ground',
      'flying': 'Flying',
      'psychic': 'Psychic',
      'bug': 'Bug',
      'rock': 'Rock',
      'ghost': 'Ghost',
      'dragon': 'Dragon',
      'dark': 'Dark',
      'steel': 'Steel',
      'fairy': 'Fairy'
    };
    
    return typeMap[name.toLowerCase()] || name.charAt(0).toUpperCase() + name.slice(1);
  }

  private formatAbilityName(name: string): string {
    // Convertir "overgrow" en "Overgrow", "solar-power" en "Solar Power"
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  clearCache(): void {
    this.cache.clear();
  }
}
