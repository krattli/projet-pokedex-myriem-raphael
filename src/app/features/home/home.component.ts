import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PokemonService } from '../../core/services/pokemon.service';
import { AuthService } from '../../core/services/auth.service';
import { CacheService } from '../../core/services/cache.service';
import { Pokemon } from '../../core/models';
import { PokedexTabsComponent } from '../../shared/components/pokedex-tabs/pokedex-tabs.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [PokedexTabsComponent, FormsModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  private pokemonService = inject(PokemonService);
  private cacheService = inject(CacheService);
  authService = inject(AuthService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  // IMPORTANT: searchQuery doit être un signal pour que computed se mette à jour
  // c'est fixé
  searchQuery = signal('');
  pokemons = signal<Pokemon[]>([]);
  loading = signal(false);
  showDropdown = false;

  filteredPokemons = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];
    
    const allMatches = this.pokemons().filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.pokedexNumber.toString().includes(query)
    );
    
    // Séparer les Pokémon qui commencent par la query de ceux qui la contiennent
    const startsWith = allMatches.filter(p => 
      p.name.toLowerCase().startsWith(query) ||
      p.pokedexNumber.toString().startsWith(query)
    );
    const contains = allMatches.filter(p => 
      !p.name.toLowerCase().startsWith(query) &&
      !p.pokedexNumber.toString().startsWith(query)
    );
    
    // Retourner d'abord ceux qui commencent, puis ceux qui contiennent
    return [...startsWith, ...contains];
  });
  
  /**
   * Retourne le HTML avec mise en évidence (sans espaces)
   */
  getHighlightedHtml(text: string, query: string): SafeHtml {
    if (!query) return this.sanitizer.bypassSecurityTrustHtml(text);
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    
    if (index === -1) return this.sanitizer.bypassSecurityTrustHtml(text);
    
    // Échapper les caractères HTML pour éviter les injections
    const escapeHtml = (str: string) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };
    
    const before = escapeHtml(text.substring(0, index));
    const match = escapeHtml(text.substring(index, index + query.length));
    const after = escapeHtml(text.substring(index + query.length));
    
    const html = `${before}<strong class="highlight">${match}</strong>${after}`;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

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

  // petit easter egg google, renvoie un pojémon aléatoire par ce que c'est drôle
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
