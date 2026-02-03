import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { PokemonService } from '../../../core/services/pokemon.service';
import { CaptureService } from '../../../core/services/capture.service';
import { TrainerService } from '../../../core/services/trainer.service';
import { JmsService, CaptureMessage } from '../../../core/services/jms.service';
import { AuthService } from '../../../core/services/auth.service';
import { CacheService } from '../../../core/services/cache.service';
import { Pokemon, Trainer, CaughtPokemon } from '../../../core/models';
import { PokedexTabsComponent } from '../../../shared/components/pokedex-tabs/pokedex-tabs.component';

/**
 * Capture enrichie avec les détails du Pokémon et du Trainer.
 * 
 * ARCHITECTURE CIBLE (après correction backend):
 * 1. On appelle GET /api/caught-pokemons → retourne [{id, captureDate, pokemonId, trainerId}, ...]
 * 2. Pour chaque pokemonId unique, on appelle GET /api/pokemons/{pokemonId} → détails du pokémon
 * 3. Pour chaque trainerId unique, on appelle GET /api/trainers/{trainerId} → nom du dresseur
 * 4. On combine les données pour l'affichage
 * 
 * FALLBACK 1 - JMS:
 * Si le backend ne retourne pas pokemonId/trainerId, on utilise l'API JMS (port 8081)
 * qui contient les informations complètes (pokemonId, pokemonName, trainerId, trainerName).
 * 
 * FALLBACK 2 - Données brutes:
 * Si l'API JMS est aussi vide, on affiche les captures brutes (id + date) avec un avertissement.
 */
export interface EnrichedCapture {
  id: number;
  captureDate: string;
  pokemonId: number;
  trainerId: number;
  // Données enrichies depuis les appels API secondaires
  pokemon?: Pokemon;
  trainer?: Trainer;
  // Raccourcis pour le template
  pokemonName: string;
  trainerName: string;
  pokedexNumber?: number;
  // Flag pour les données brutes (sans détails)
  isRawData?: boolean;
}

@Component({
  selector: 'app-captures-list',
  standalone: true,
  imports: [RouterLink, FormsModule, PokedexTabsComponent],
  templateUrl: './captures-list.component.html',
  styleUrls: ['./captures-list.component.css']
})
export class CapturesListComponent implements OnInit {
  private pokemonService = inject(PokemonService);
  private captureService = inject(CaptureService);
  private trainerService = inject(TrainerService);
  private jmsService = inject(JmsService);
  private cacheService = inject(CacheService);
  authService = inject(AuthService);

  viewMode = signal<'my' | 'all' | 'recent'>('my');
  
  /**
   * Toutes les captures enrichies avec les détails Pokemon et Trainer.
   */
  allCaptures = signal<EnrichedCapture[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  searchQuery = '';
  sortDesc = true;

  /**
   * Mode de données utilisé.
   * - 'rest': API REST principale (backend corrigé)
   * - 'jms': Fallback vers API JMS
   * - 'raw': Données brutes (ni REST ni JMS ne fonctionnent correctement)
   */
  dataMode = signal<'rest' | 'jms' | 'raw'>('rest');

  /**
   * Filtre les captures selon le mode de vue actuel
   */
  capturesForCurrentView = computed((): EnrichedCapture[] => {
    const mode = this.viewMode();
    const all = this.allCaptures();
    
    if (mode === 'my') {
      const trainerId = this.authService.getTrainerId();
      // Si on a des données brutes, on ne peut pas filtrer par trainer
      if (this.dataMode() === 'raw') {
        return all; // Afficher tout car on ne connaît pas les trainers
      }
      return all.filter(c => c.trainerId === trainerId);
    }
    return all;
  });

  /**
   * Applique le filtre de recherche
   */
  filteredCaptures = computed((): EnrichedCapture[] => {
    const query = this.searchQuery.toLowerCase().trim();
    const captures = this.capturesForCurrentView();
    
    if (!query) return captures;
    
    return captures.filter(c => 
      c.pokemonName.toLowerCase().includes(query) ||
      c.trainerName.toLowerCase().includes(query)
    );
  });

  /**
   * Trie les captures par date
   */
  sortedCaptures = computed((): EnrichedCapture[] => {
    const filtered = this.filteredCaptures();
    const desc = this.sortDesc;

    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.captureDate).getTime();
      const dateB = new Date(b.captureDate).getTime();
      return desc ? dateB - dateA : dateA - dateB;
    });
  });

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.loadData();
    } else {
      this.loading.set(false);
    }
  }

  setViewMode(mode: 'my' | 'all' | 'recent'): void {
    this.viewMode.set(mode);
    this.searchQuery = '';
  }

  /**
   * Charge les données en essayant dans l'ordre:
   * 1. API REST principale (si corrigée avec pokemonId/trainerId)
   * 2. API JMS (fallback)
   * 3. Données brutes (dernier recours)
   */
  private loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    // Charger en parallèle: captures REST et captures JMS
    forkJoin({
      restCaptures: this.captureService.getAll().pipe(catchError(() => of([]))),
      jmsCaptures: this.jmsService.getAllCaptures().pipe(catchError(() => of([])))
    }).pipe(
      switchMap(({ restCaptures, jmsCaptures }) => {
        console.log('Captures REST:', restCaptures.length, restCaptures);
        console.log('Captures JMS:', jmsCaptures.length, jmsCaptures);

        // Cas 1: Backend REST corrigé (retourne pokemonId/trainerId)
        const hasRestDetails = restCaptures.some(c => c.pokemonId !== undefined && c.trainerId !== undefined);
        if (hasRestDetails) {
          console.log('✅ Utilisation de l\'API REST (backend corrigé)');
          this.dataMode.set('rest');
          return this.enrichCapturesFromRestApi(restCaptures);
        }

        // Cas 2: Fallback JMS (a des captures)
        if (jmsCaptures.length > 0) {
          console.log('📡 Utilisation de l\'API JMS (fallback)');
          this.dataMode.set('jms');
          return this.enrichCapturesFromJms(jmsCaptures);
        }

        // Cas 3: Données brutes (ni REST ni JMS ne fonctionnent)
        if (restCaptures.length > 0) {
          console.log('⚠️ Mode données brutes (aucun détail disponible)');
          this.dataMode.set('raw');
          return of(this.convertToRawCaptures(restCaptures));
        }

        // Aucune capture
        return of([]);
      })
    ).subscribe({
      next: (enrichedCaptures) => {
        console.log('Captures finales:', enrichedCaptures);
        this.allCaptures.set(enrichedCaptures);
          this.loading.set(false);
        },
      error: (err) => {
        console.error('Erreur:', err);
        this.loading.set(false);
        this.error.set('Erreur lors du chargement des captures.');
      }
    });
  }

  /**
   * Convertit les captures REST en EnrichedCapture avec les données JMS.
   */
  private enrichCapturesFromJms(jmsCaptures: CaptureMessage[]): Observable<EnrichedCapture[]> {
    return this.loadAllPokemons().pipe(
      map(pokemons => {
        const pokemonMap = new Map<number, Pokemon>();
        pokemons.forEach(p => pokemonMap.set(p.id, p));

        return jmsCaptures.map((msg: CaptureMessage) => {
          const pokemon = pokemonMap.get(msg.pokemonId);
          return {
            id: 0, // JMS n'a pas d'ID de capture
            captureDate: msg.captureDate,
            pokemonId: msg.pokemonId,
            trainerId: msg.trainerId,
            pokemon,
            pokemonName: msg.pokemonName,
            trainerName: msg.trainerName,
            pokedexNumber: pokemon?.pokedexNumber
          } as EnrichedCapture;
        });
      })
    );
  }

  /**
   * Convertit les captures brutes en EnrichedCapture sans détails.
   */
  private convertToRawCaptures(captures: CaughtPokemon[]): EnrichedCapture[] {
    return captures.map(c => ({
      id: c.id,
      captureDate: c.captureDate,
      pokemonId: 0,
      trainerId: 0,
      pokemonName: '???',
      trainerName: '???',
      pokedexNumber: undefined,
      isRawData: true
    }));
  }

  /**
   * Enrichit les captures depuis l'API REST (quand le backend est corrigé).
   */
  private enrichCapturesFromRestApi(captures: CaughtPokemon[]): Observable<EnrichedCapture[]> {
    const uniquePokemonIds = [...new Set(captures.map(c => c.pokemonId).filter((id): id is number => id !== undefined))];
    const uniqueTrainerIds = [...new Set(captures.map(c => c.trainerId).filter((id): id is number => id !== undefined))];

    return forkJoin({
      pokemons: this.loadPokemonsByIds(uniquePokemonIds),
      trainers: this.loadTrainersByIds(uniqueTrainerIds)
    }).pipe(
      map(({ pokemons, trainers }) => {
        const pokemonMap = new Map<number, Pokemon>();
        pokemons.forEach(p => pokemonMap.set(p.id, p));
        
        const trainerMap = new Map<number, Trainer>();
        trainers.forEach(t => {
          if (t.id !== undefined) {
            trainerMap.set(t.id, t);
          }
        });

        return this.enrichCaptures(captures, pokemonMap, trainerMap);
      })
    );
  }

  private loadAllPokemons(): Observable<Pokemon[]> {
    const cached = this.cacheService.getPokemons();
    if (cached) return of(cached);
    
    return this.pokemonService.getAll().pipe(
      map(pokemons => {
        this.cacheService.setPokemons(pokemons);
        return pokemons;
      }),
      catchError(() => of([]))
    );
  }

  private loadPokemonsByIds(ids: number[]): Observable<Pokemon[]> {
    if (ids.length === 0) return of([]);

    const cached = this.cacheService.getPokemons();
    if (cached) {
      const filtered = cached.filter(p => ids.includes(p.id));
      if (filtered.length === ids.length) return of(filtered);
    }

    return this.pokemonService.getAll().pipe(
      map(allPokemons => {
        this.cacheService.setPokemons(allPokemons);
        return allPokemons.filter(p => ids.includes(p.id));
      }),
      catchError(() => of([]))
    );
  }

  private loadTrainersByIds(ids: number[]): Observable<Trainer[]> {
    if (ids.length === 0) return of([]);

    const trainerCalls = ids.map(id => 
      this.trainerService.getById(id).pipe(
        catchError(() => of(null as unknown as Trainer))
      )
    );

    return forkJoin(trainerCalls).pipe(
      map(trainers => trainers.filter((t): t is Trainer => t !== null))
    );
  }

  private enrichCaptures(
    captures: CaughtPokemon[],
    pokemonMap: Map<number, Pokemon>,
    trainerMap: Map<number, Trainer>
  ): EnrichedCapture[] {
    return captures
      .filter(c => c.pokemonId !== undefined && c.trainerId !== undefined)
      .map(capture => {
        const pokemon = pokemonMap.get(capture.pokemonId!);
        const trainer = trainerMap.get(capture.trainerId!);

        return {
          id: capture.id,
          captureDate: capture.captureDate,
          pokemonId: capture.pokemonId!,
          trainerId: capture.trainerId!,
          pokemon,
          trainer,
          pokemonName: pokemon?.name || `Pokemon #${capture.pokemonId}`,
          trainerName: trainer?.name || `Trainer #${capture.trainerId}`,
          pokedexNumber: pokemon?.pokedexNumber
        };
      });
  }

  getPokeApiSprite(pokedexNumber: number | undefined): string {
    if (!pokedexNumber) {
      return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect fill="%23eee" width="40" height="40"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="10">?</text></svg>';
    }
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokedexNumber}.png`;
  }

  onIconError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect fill="%23eee" width="40" height="40"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="10">?</text></svg>';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  releasePokemon(captureId: number): void {
    if (captureId === 0) {
      alert('Impossible de relâcher ce Pokémon (données JMS uniquement).');
      return;
    }
    
    if (!confirm('Voulez-vous vraiment relâcher ce Pokémon ?')) return;

    this.captureService.delete(captureId).subscribe({
        next: () => {
        const current = this.allCaptures();
        this.allCaptures.set(current.filter(c => c.id !== captureId));
        },
        error: (err) => {
        console.error('Erreur lors du relâchement:', err);
        alert('Impossible de relâcher ce Pokémon.');
        }
      });
  }
}
