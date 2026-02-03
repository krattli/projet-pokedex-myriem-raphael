import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, switchMap } from 'rxjs';
/**
 * A surement été le plus compliqué à implémenter
 * Les api sont très lentes donc on a choisi une bdd en local 
 * Qu'il faut alimenter via un script nodejs 
 * mais même ce script est très long et inconsistant
 * Mais il permet d'avoir des images de cartes tcg très belles pour chaque pokémon
 */

export interface TcgCard {
  id: string;
  name: string;
  supertype: string;
  subtypes: string[];
  hp?: string;
  types?: string[];
  nationalPokedexNumbers?: number[];
  set: {
    id: string;
    name: string;
    series: string;
    releaseDate: string;
  };
  number: string;
  artist?: string;
  rarity?: string;
  images: {
    small: string;
    large: string;
  };
}

interface LocalTcgMetadata {
  pokedexNumber: number;
  downloadedAt: string;
  cards: {
    filename: string;
    cardId: string;
    name: string;
    set: string;
    rarity?: string;
    imageUrl: string;
  }[];
}

@Injectable({ providedIn: 'root' })
export class PokemonTcgService {
  private http = inject(HttpClient);

  private readonly API_BASE_URL = 'https://api.pokemontcg.io/v2';
  private readonly LOCAL_BASE_URL = '/tcg-cards';

  /** Cache mémoire (inchangé) */
  private cache = new Map<number, TcgCard[]>();

  /** Modal */
  private _selectedCard = signal<TcgCard | null>(null);
  readonly selectedCard = this._selectedCard.asReadonly();

  /** ================================
   *  API PUBLIQUE (INCHANGÉE)
   *  ================================ */
  getCardsByPokedexNumber(
    pokedexNumber: number,
    limit: number = 10
  ): Observable<TcgCard[]> {

    if (this.cache.has(pokedexNumber)) {
      return of(this.cache.get(pokedexNumber)!.slice(0, limit));
    }

    return this.loadLocalCards(pokedexNumber, limit).pipe(
      switchMap(localCards => {
        if (localCards.length > 0) {
          this.cache.set(pokedexNumber, localCards);
          return of(localCards);
        }
        return this.loadRemoteCards(pokedexNumber, limit);
      }),
      catchError(() => of([]))
    );
  }

  openCard(card: TcgCard): void {
    this._selectedCard.set(card);
  }

  closeCard(): void {
    this._selectedCard.set(null);
  }

  hasCachedCards(pokedexNumber: number): boolean {
    return this.cache.has(pokedexNumber);
  }

  getCachedCards(pokedexNumber: number): TcgCard[] | null {
    return this.cache.get(pokedexNumber) ?? null;
  }

  clearCache(): void {
    this.cache.clear();
  }

  /** ================================
   *  LOCAL
   *  ================================ */
  private loadLocalCards(
    pokedexNumber: number,
    limit: number
  ): Observable<TcgCard[]> {

    const dir = String(pokedexNumber).padStart(4, '0');
    const url = `${this.LOCAL_BASE_URL}/${dir}/metadata.json`;

    return this.http.get<LocalTcgMetadata>(url).pipe(
      map(meta =>
        meta.cards.slice(0, limit).map((c, index) => ({
          id: c.cardId,
          name: c.name,
          supertype: 'Pokémon',
          subtypes: [],
          nationalPokedexNumbers: [pokedexNumber],
          set: {
            id: '',
            name: c.set,
            series: '',
            releaseDate: meta.downloadedAt
          },
          number: String(index + 1),
          rarity: c.rarity,
          images: {
            small: `${this.LOCAL_BASE_URL}/${dir}/${c.filename}`,
            large: `${this.LOCAL_BASE_URL}/${dir}/${c.filename}`
          }
        }))
      ),
      catchError(() => of([]))
    );
  }

  /** ================================
   *  REMOTE (fallback)
   *  ================================ */
  private loadRemoteCards(
    pokedexNumber: number,
    limit: number
  ): Observable<TcgCard[]> {

    return this.http.get<any>(
      `${this.API_BASE_URL}/cards?q=nationalPokedexNumbers:${pokedexNumber}&pageSize=${limit}&orderBy=-set.releaseDate`
    ).pipe(
      map(res => {
        const cards = res.data ?? [];
        this.cache.set(pokedexNumber, cards);
        return cards;
      }),
      catchError(() => of([]))
    );
  }
}
