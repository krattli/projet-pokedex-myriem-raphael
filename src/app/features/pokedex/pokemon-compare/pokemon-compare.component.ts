import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { PokemonService } from '../../../core/services/pokemon.service';
import { CacheService } from '../../../core/services/cache.service';
import { Pokemon, PokemonComparison } from '../../../core/models';

@Component({
  selector: 'app-pokemon-compare',
  standalone: true,
  imports: [FormsModule, DecimalPipe, RouterLink],
  templateUrl: './pokemon-compare.component.html',
  styleUrls: ['./pokemon-compare.component.css']
})
export class PokemonCompareComponent {
  private pokemonService = inject(PokemonService);
  private cacheService = inject(CacheService);
  private router = inject(Router);

  pokemons = signal<Pokemon[]>([]);
  selectedPokemonIds = signal<number[]>([]);
  // IMPORTANT: searchQuery doit être un signal pour que computed se mette à jour
  // c'est fixé
  searchQuery = signal('');
  showDropdown = false;
  loading = signal(true);
  comparing = signal(false);
  comparison = signal<PokemonComparison | null>(null);

  selectedPokemons = computed(() => {
    return this.selectedPokemonIds().map(id => 
      this.pokemons().find(p => p.id === id)
    ).filter((p): p is Pokemon => p !== undefined);
  });

  filteredPokemons = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const selected = this.selectedPokemonIds();
    const available = this.pokemons().filter(p => !selected.includes(p.id));
    
    if (!query) return available;
    
    return available.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.pokedexNumber.toString().includes(query)
    );
  });

  constructor() {
    this.loadPokemons();
    
    // Fermer dropdown quand on clique ailleurs ofc
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.search-box') && !target.closest('.search-dropdown')) {
        this.showDropdown = false;
      }
    });
  }

  loadPokemons(): void {
    const cached = this.cacheService.getPokemons();
    if (cached) {
      this.pokemons.set(cached);
      this.loading.set(false);
      return;
    }

    this.pokemonService.getAll().subscribe({
      next: (pokemons) => {
        this.pokemons.set(pokemons);
        this.cacheService.setPokemons(pokemons);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.showDropdown = true;
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.showDropdown = false;
  }

  addPokemon(pokemon: Pokemon): void {
    if (!this.selectedPokemonIds().includes(pokemon.id)) {
      this.selectedPokemonIds.update(ids => [...ids, pokemon.id]);
    }
    this.searchQuery.set('');
    this.showDropdown = false;
  }

  removePokemon(id: number): void {
    this.selectedPokemonIds.update(ids => ids.filter(i => i !== id));
    this.comparison.set(null);
  }

  clearAll(): void {
    this.selectedPokemonIds.set([]);
    this.comparison.set(null);
  }

  compare(): void {
    if (this.selectedPokemonIds().length < 2) return;

    this.comparing.set(true);
    this.pokemonService.compare(this.selectedPokemonIds()).subscribe({
      next: (result) => {
        this.comparison.set(result);
        this.comparing.set(false);
      },
      error: () => {
        this.comparing.set(false);
      }
    });
  }

  getSpriteUrl(pokedexNumber: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokedexNumber}.png`;
  }

  getTypeImgUrl(typeName: string): string {
    return `https://play.pokemonshowdown.com/sprites/types/${typeName}.png`;
  }

  getTotal(pokemon: Pokemon): number {
    return pokemon.hp + pokemon.attack + pokemon.defense + pokemon.speed;
  }

  getMaxTotal(): number {
    const comp = this.comparison();
    if (!comp) return 0;
    return Math.max(...comp.pokemons.map(p => this.getTotal(p)));
  }

  getMinTotal(): number {
    const comp = this.comparison();
    if (!comp) return 0;
    return Math.min(...comp.pokemons.map(p => this.getTotal(p)));
  }

  getAvgTotal(): number {
    const comp = this.comparison();
    if (!comp) return 0;
    const totals = comp.pokemons.map(p => this.getTotal(p));
    return totals.reduce((a, b) => a + b, 0) / totals.length;
  }
}
