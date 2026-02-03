import { Component, Input, Output, EventEmitter, inject, signal, computed, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Pokemon } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { CaptureService } from '../../../core/services/capture.service';
import { CacheService } from '../../../core/services/cache.service';
import { PokeApiService, PokemonExtraData } from '../../../core/services/pokeapi.service';
import { PokemonTcgService, TcgCard } from '../../../core/services/pokemon-tcg.service';
import { TypeBadgeComponent } from '../type-badge/type-badge.component';
import { StatBarComponent } from '../stat-bar/stat-bar.component';
import { TcgCardComponent } from '../tcg-card/tcg-card.component';
import { FormsModule } from '@angular/forms';

interface StatCalc {
  name: string;
  base: number;
  minMinus: number;
  min: number;
  max: number;
  maxPlus: number;
}

@Component({
  selector: 'app-pokemon-detail-panel',
  standalone: true,
  imports: [DecimalPipe, TypeBadgeComponent, StatBarComponent, TcgCardComponent, FormsModule],
  templateUrl: './pokemon-detail-panel.component.html',
  styleUrls: ['./pokemon-detail-panel.component.css']
})
export class PokemonDetailPanelComponent implements OnInit, OnChanges {
  @Input({ required: true }) pokemon!: Pokemon;
  @Output() close = new EventEmitter<void>();
  @Output() captured = new EventEmitter<Pokemon>();

  authService = inject(AuthService);
  private captureService = inject(CaptureService);
  private cacheService = inject(CacheService);
  private pokeApiService = inject(PokeApiService);
  private tcgService = inject(PokemonTcgService);

  successMessage: string | null = null;
  
  // Données PokéAPI
  extraData = signal<PokemonExtraData | null>(null);
  loadingExtra = signal(false);
  
  // Cartes TCG
  tcgCards = signal<TcgCard[]>([]);
  loadingCards = signal(false);
  
  // Calculateur de stats
  level = signal(100);
  
  // Types à afficher (priorité: PokéAPI > DB locale)
  displayTypes = computed(() => {
    const extra = this.extraData();
    if (extra && extra.types.length > 0) {
      return extra.types;
    }
    // Fallback sur les types de la DB locale
    return this.pokemon?.types?.map(t => t.name) || [];
  });

  // Calcul des stats
  calculatedStats = computed(() => {
    const lvl = this.level();
    const stats: StatCalc[] = [
      { name: 'HP', base: this.pokemon.hp, ...this.calcHpStats(this.pokemon.hp, lvl) },
      { name: 'Atk', base: this.pokemon.attack, ...this.calcOtherStats(this.pokemon.attack, lvl) },
      { name: 'Def', base: this.pokemon.defense, ...this.calcOtherStats(this.pokemon.defense, lvl) },
      { name: 'Spe', base: this.pokemon.speed, ...this.calcOtherStats(this.pokemon.speed, lvl) },
    ];
    return stats;
  });

  ngOnInit(): void {
    this.loadExtraData();
    this.loadTcgCards();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pokemon'] && !changes['pokemon'].firstChange) {
      this.loadExtraData();
      this.loadTcgCards();
    }
  }

  private loadExtraData(): void {
    if (!this.pokemon) return;
    
    this.loadingExtra.set(true);
    this.pokeApiService.getPokemonData(this.pokemon.pokedexNumber).subscribe({
      next: (data) => {
        this.extraData.set(data);
        this.loadingExtra.set(false);
      },
      error: () => {
        this.loadingExtra.set(false);
      }
    });
  }

  private loadTcgCards(): void {
    if (!this.pokemon) return;
    
    // Vérifier d'abord le cache
    const cachedCards = this.tcgService.getCachedCards(this.pokemon.pokedexNumber);
    if (cachedCards !== null) {
      this.tcgCards.set(cachedCards);
      this.loadingCards.set(false);
      return;
    }
    
    this.loadingCards.set(true);
    // Utiliser le numéro Pokédex pour la recherche (plus fiable que le nom)
    this.tcgService.getCardsByPokedexNumber(this.pokemon.pokedexNumber, 10).subscribe({
      next: (cards) => {
        this.tcgCards.set(cards);
        this.loadingCards.set(false);
      },
      error: () => {
        this.loadingCards.set(false);
      }
    });
  }

  getSpriteUrl(): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${this.pokemon.pokedexNumber}.png`;
  }

  getArtworkUrl(): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${this.pokemon.pokedexNumber}.png`;
  }

  getTotalStats(): number {
    return this.pokemon.hp + this.pokemon.attack + this.pokemon.defense + this.pokemon.speed;
  }

  // Formule HP: floor(((2 * Base + IV + floor(EV/4)) * Level / 100) + Level + 10)
  private calcHpStats(base: number, level: number): { minMinus: number; min: number; max: number; maxPlus: number } {
    // HP n'est pas affecté par la nature
    const min = Math.floor(((2 * base + 0 + Math.floor(0 / 4)) * level / 100) + level + 10);
    const max = Math.floor(((2 * base + 31 + Math.floor(252 / 4)) * level / 100) + level + 10);
    return { minMinus: min, min, max, maxPlus: max };
  }

  // Formule autres stats: floor((floor(((2 * Base + IV + floor(EV/4)) * Level / 100) + 5) * Nature)
  private calcOtherStats(base: number, level: number): { minMinus: number; min: number; max: number; maxPlus: number } {
    const minBase = Math.floor(((2 * base + 0 + Math.floor(0 / 4)) * level / 100) + 5);
    const maxBase = Math.floor(((2 * base + 31 + Math.floor(252 / 4)) * level / 100) + 5);
    
    return {
      minMinus: Math.floor(minBase * 0.9),  // Nature néfaste
      min: minBase,                          // Nature neutre
      max: maxBase,                          // Nature neutre
      maxPlus: Math.floor(maxBase * 1.1)    // Nature bénéfique
    };
  }

  onLevelChange(event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    if (value >= 1 && value <= 100) {
      this.level.set(value);
    }
  }

  setLevel(lvl: number): void {
    this.level.set(lvl);
  }

  capture(): void {
    const trainerId = this.authService.getTrainerId();
    if (!trainerId) return;

    if (!confirm(`Êtes-vous sûr de vouloir capturer ${this.pokemon.name} ?\nIl sera ajouté à votre Pokédex.`)) {
      return;
    }

    this.captureService.capture({ trainerId, pokemonId: this.pokemon.id }).subscribe({
      next: () => {
        this.successMessage = `${this.pokemon.name} capturé !`;
        this.cacheService.invalidateCaptures();
        this.captured.emit(this.pokemon);
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (err) => {
        console.error('Erreur lors de la capture:', err);
      }
    });
  }
}
