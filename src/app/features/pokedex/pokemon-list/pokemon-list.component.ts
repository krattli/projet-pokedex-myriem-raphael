import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PokemonService } from '../../../core/services/pokemon.service';
import { AuthService } from '../../../core/services/auth.service';
import { CaptureService } from '../../../core/services/capture.service';
import { CacheService } from '../../../core/services/cache.service';
import { Pokemon } from '../../../core/models';
import { PokemonListItemComponent } from '../../../shared/components/pokemon-list-item/pokemon-list-item.component';
import { PokemonDetailPanelComponent } from '../../../shared/components/pokemon-detail-panel/pokemon-detail-panel.component';
import { SearchableListComponent } from '../../../shared/components/searchable-list/searchable-list.component';
import { SortColumn } from '../../../shared/components/sortable-list-header/sortable-list-header.component';
import { PokedexTabsComponent } from '../../../shared/components/pokedex-tabs/pokedex-tabs.component';

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  imports: [RouterLink, PokemonListItemComponent, PokemonDetailPanelComponent, SearchableListComponent, PokedexTabsComponent],
  templateUrl: './pokemon-list.component.html',
  styleUrls: ['./pokemon-list.component.css']
})
export class PokemonListComponent implements OnInit {
  private pokemonService = inject(PokemonService);
  private captureService = inject(CaptureService);
  private cacheService = inject(CacheService);
  authService = inject(AuthService);

  pokemons = signal<Pokemon[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  searchQuery = signal('');
  sortKey = signal('pokedexNumber');
  sortDesc = signal(false);
  successMessage = signal<string | null>(null);
  selectedPokemon = signal<Pokemon | null>(null);

  columns: SortColumn[] = [
    { key: 'pokedexNumber', label: '#', width: '50px' },
    { key: 'icon', label: '', width: '50px', sortable: false },
    { key: 'name', label: 'Nom' },
    { key: 'types', label: 'Types', width: '80px', sortable: false },
    { key: 'hp', label: 'HP', width: '45px' },
    { key: 'attack', label: 'Atk', width: '45px' },
    { key: 'defense', label: 'Def', width: '45px' },
    { key: 'speed', label: 'Spe', width: '45px' },
    { key: 'bst', label: 'BST', width: '50px' },
    { key: 'action', label: '', width: '40px', sortable: false }
  ];

  filteredPokemons = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.pokemons();
    
    return this.pokemons().filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.pokedexNumber.toString().includes(query)
    );
  });

  sortedPokemons = computed(() => {
    const filtered = this.filteredPokemons();
    const key = this.sortKey();
    const desc = this.sortDesc();

    return [...filtered].sort((a, b) => {
      let aVal: any, bVal: any;
      
      if (key === 'bst') {
        aVal = a.hp + a.attack + a.defense + a.speed;
        bVal = b.hp + b.attack + b.defense + b.speed;
      } else {
        aVal = (a as any)[key];
        bVal = (b as any)[key];
      }

      if (typeof aVal === 'string') {
        return desc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }
      return desc ? bVal - aVal : aVal - bVal;
    });
  });

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.loadPokemons();
    } else {
      this.loading.set(false);
    }
  }

  loadPokemons(): void {
    const cached = this.cacheService.getPokemons();
    if (cached) {
      this.pokemons.set(cached);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    
    this.pokemonService.getAll().subscribe({
      next: (pokemons) => {
        this.pokemons.set(pokemons);
        this.cacheService.setPokemons(pokemons);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Error loading pokemons:', err);
        if (err.status === 401) {
          this.error.set('Session expirée. Veuillez vous reconnecter.');
        } else {
          this.error.set('Erreur lors du chargement des Pokémon.');
        }
      }
    });
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  onSortChange(event: { key: string; desc: boolean }): void {
    this.sortKey.set(event.key);
    this.sortDesc.set(event.desc);
  }

  selectPokemon(pokemon: Pokemon): void {
    if (this.selectedPokemon()?.id === pokemon.id) {
      this.selectedPokemon.set(null);
    } else {
      this.selectedPokemon.set(pokemon);
    }
  }

  closePokemon(): void {
    this.selectedPokemon.set(null);
  }

  onPokemonCaptured(pokemon: Pokemon): void {
    this.successMessage.set(`${pokemon.name} a été capturé !`);
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  capturePokemon(pokemon: Pokemon): void {
    const trainerId = this.authService.getTrainerId();
    if (!trainerId) return;

    if (!confirm(`Êtes-vous sûr de vouloir capturer ${pokemon.name} ?\nIl sera ajouté à votre Pokédex.`)) {
      return;
    }

    this.captureService.capture({ trainerId, pokemonId: pokemon.id }).subscribe({
      next: () => {
        this.successMessage.set(`${pokemon.name} a été capturé !`);
        this.cacheService.invalidateCaptures();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        console.error('Erreur lors de la capture:', err);
      }
    });
  }
}
