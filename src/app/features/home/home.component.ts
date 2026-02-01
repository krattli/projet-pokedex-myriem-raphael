import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PokemonService } from '../../core/services/pokemon.service';
import { AuthService } from '../../core/services/auth.service';
import { CacheService } from '../../core/services/cache.service';
import { Pokemon } from '../../core/models';
import { PokedexTabsComponent } from '../../shared/components/pokedex-tabs/pokedex-tabs.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [PokedexTabsComponent, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  private pokemonService = inject(PokemonService);
  private cacheService = inject(CacheService);
  authService = inject(AuthService);
  private router = inject(Router);

  // IMPORTANT: searchQuery doit être un signal pour que computed se mette à jour
  searchQuery = signal('');
  pokemons = signal<Pokemon[]>([]);
  loading = signal(false);
  showDropdown = false;

  filteredPokemons = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];
    
    return this.pokemons().filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.pokedexNumber.toString().includes(query)
    );
  });

  constructor() {
    if (this.authService.isLoggedIn()) {
      this.loadPokemons();
    }

    // Fermer dropdown quand on clique ailleurs
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
      return;
    }

    this.loading.set(true);
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

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.showDropdown = true;
    if (this.authService.isLoggedIn() && this.pokemons().length === 0) {
      this.loadPokemons();
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.showDropdown = false;
  }

  getSpriteUrl(pokedexNumber: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokedexNumber}.png`;
  }

  getTypeImgUrl(typeName: string): string {
    return `https://play.pokemonshowdown.com/sprites/types/${typeName}.png`;
  }

  goToPokemon(pokemon: Pokemon): void {
    this.showDropdown = false;
    this.router.navigate(['/pokedex', pokemon.id]);
  }

  navigateToPokedex(): void {
    this.router.navigate(['/pokedex']);
  }

  feelingLucky(): void {
    const all = this.pokemons();
    if (all.length > 0) {
      const random = all[Math.floor(Math.random() * all.length)];
      this.router.navigate(['/pokedex', random.id]);
    } else if (this.authService.isLoggedIn()) {
      this.loadPokemons();
    }
  }
}
