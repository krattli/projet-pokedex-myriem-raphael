import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, Subject } from 'rxjs';

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

export interface TcgApiResponse {
  data: TcgCard[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class PokemonTcgService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'https://api.pokemontcg.io/v2';
  
  // Cache par numéro Pokédex (plus fiable que le nom)
  private cache = new Map<number, TcgCard[]>();
  
  // Signal pour le modal global
  private _selectedCard = signal<TcgCard | null>(null);
  readonly selectedCard = this._selectedCard.asReadonly();
  
  // Subject pour notifier l'ouverture/fermeture du modal
  private modalSubject = new Subject<TcgCard | null>();
  readonly modalChange$ = this.modalSubject.asObservable();

  /**
   * Récupère les cartes TCG par numéro Pokédex national
   * Plus fiable que la recherche par nom car l'API utilise les noms anglais
   */
  getCardsByPokedexNumber(pokedexNumber: number, limit: number = 10): Observable<TcgCard[]> {
    // Vérifier le cache
    if (this.cache.has(pokedexNumber)) {
      return of(this.cache.get(pokedexNumber)!.slice(0, limit));
    }

    // Recherche par nationalPokedexNumbers (champ de l'API TCG)
    return this.http.get<TcgApiResponse>(
      `${this.baseUrl}/cards?q=nationalPokedexNumbers:${pokedexNumber}&pageSize=${limit}&orderBy=-set.releaseDate`
    ).pipe(
      map(response => {
        const cards = response.data || [];
        // Mettre en cache
        this.cache.set(pokedexNumber, cards);
        return cards;
      }),
      catchError(err => {
        console.error(`Erreur lors de la récupération des cartes TCG pour Pokédex #${pokedexNumber}:`, err);
        // Mettre en cache même les erreurs pour éviter de réessayer
        this.cache.set(pokedexNumber, []);
        return of([]);
      })
    );
  }

  /**
   * Ouvre le modal avec la carte sélectionnée
   */
  openCard(card: TcgCard): void {
    this._selectedCard.set(card);
    this.modalSubject.next(card);
  }

  /**
   * Ferme le modal
   */
  closeCard(): void {
    this._selectedCard.set(null);
    this.modalSubject.next(null);
  }

  /**
   * Vérifie si une carte est en cache
   */
  hasCachedCards(pokedexNumber: number): boolean {
    return this.cache.has(pokedexNumber);
  }

  /**
   * Récupère les cartes du cache sans faire d'appel API
   */
  getCachedCards(pokedexNumber: number): TcgCard[] | null {
    return this.cache.get(pokedexNumber) || null;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
