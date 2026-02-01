import { Injectable, signal } from '@angular/core';
import { Pokemon, Type, CaughtPokemon } from '../models';

interface CacheData {
  pokemons: Pokemon[] | null;
  types: Type[] | null;
  captures: Map<string, CaughtPokemon[]>; // key = 'all' | 'trainer-{id}'
  lastFetch: Map<string, number>;
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache: CacheData = {
    pokemons: null,
    types: null,
    captures: new Map(),
    lastFetch: new Map()
  };

  // Cache TTL in milliseconds (5 minutes)
  private readonly CACHE_TTL = 5 * 60 * 1000;

  // Signals pour réactivité
  pokemonsCache = signal<Pokemon[] | null>(null);
  typesCache = signal<Type[] | null>(null);

  // Pokémons
  getPokemons(): Pokemon[] | null {
    if (this.isExpired('pokemons')) {
      return null;
    }
    return this.cache.pokemons;
  }

  setPokemons(pokemons: Pokemon[]): void {
    this.cache.pokemons = pokemons;
    this.cache.lastFetch.set('pokemons', Date.now());
    this.pokemonsCache.set(pokemons);
  }

  // Types
  getTypes(): Type[] | null {
    if (this.isExpired('types')) {
      return null;
    }
    return this.cache.types;
  }

  setTypes(types: Type[]): void {
    this.cache.types = types;
    this.cache.lastFetch.set('types', Date.now());
    this.typesCache.set(types);
  }

  // Captures
  getCaptures(key: string): CaughtPokemon[] | null {
    if (this.isExpired(`captures-${key}`)) {
      return null;
    }
    return this.cache.captures.get(key) || null;
  }

  setCaptures(key: string, captures: CaughtPokemon[]): void {
    this.cache.captures.set(key, captures);
    this.cache.lastFetch.set(`captures-${key}`, Date.now());
  }

  // Invalidation
  invalidateCaptures(): void {
    this.cache.captures.clear();
    // Remove all capture-related entries from lastFetch
    for (const key of this.cache.lastFetch.keys()) {
      if (key.startsWith('captures-')) {
        this.cache.lastFetch.delete(key);
      }
    }
  }

  invalidateAll(): void {
    this.cache.pokemons = null;
    this.cache.types = null;
    this.cache.captures.clear();
    this.cache.lastFetch.clear();
    this.pokemonsCache.set(null);
    this.typesCache.set(null);
  }

  private isExpired(key: string): boolean {
    const lastFetch = this.cache.lastFetch.get(key);
    if (!lastFetch) return true;
    return Date.now() - lastFetch > this.CACHE_TTL;
  }
}
