import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CaptureService } from '../../../core/services/capture.service';
import { JmsService, CaptureMessage } from '../../../core/services/jms.service';
import { AuthService } from '../../../core/services/auth.service';
import { CacheService } from '../../../core/services/cache.service';
import { CaughtPokemon } from '../../../core/models';
import { CaptureListItemComponent } from '../../../shared/components/capture-list-item/capture-list-item.component';
import { SortableListHeaderComponent, SortColumn } from '../../../shared/components/sortable-list-header/sortable-list-header.component';
import { PokedexTabsComponent } from '../../../shared/components/pokedex-tabs/pokedex-tabs.component';

@Component({
  selector: 'app-captures-list',
  standalone: true,
  imports: [RouterLink, FormsModule, CaptureListItemComponent, SortableListHeaderComponent, PokedexTabsComponent],
  templateUrl: './captures-list.component.html',
  styleUrls: ['./captures-list.component.css']
})
export class CapturesListComponent implements OnInit {
  private captureService = inject(CaptureService);
  private jmsService = inject(JmsService);
  private cacheService = inject(CacheService);
  authService = inject(AuthService);

  viewMode = signal<'my' | 'all' | 'recent'>('my');
  captures = signal<CaughtPokemon[]>([]);
  jmsCaptures = signal<CaptureMessage[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  backendWarning = signal(false);
  searchQuery = '';
  sortKey = 'captureDate';
  sortDesc = true;

  captureColumns: SortColumn[] = [
    { key: 'icon', label: '', width: '50px', sortable: false },
    { key: 'num', label: '#', width: '50px', sortable: false },
    { key: 'name', label: 'Pokémon', sortable: false },
    { key: 'trainer', label: 'Dresseur', width: '150px', sortable: false },
    { key: 'captureDate', label: 'Date', width: '180px' },
    { key: 'action', label: '', width: '50px', sortable: false }
  ];

  filteredCaptures = computed(() => {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) return this.captures();
    
    return this.captures().filter(c => {
      const pokemonName = c.pokemon?.name?.toLowerCase() || '';
      const trainerName = c.trainer?.name?.toLowerCase() || '';
      return pokemonName.includes(query) || trainerName.includes(query);
    });
  });

  filteredJmsCaptures = computed(() => {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) return this.jmsCaptures();
    
    return this.jmsCaptures().filter(c => 
      c.pokemonName.toLowerCase().includes(query) ||
      c.trainerName.toLowerCase().includes(query)
    );
  });

  sortedCaptures = computed(() => {
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
      this.loadCaptures();
    } else {
      this.loading.set(false);
    }
  }

  setViewMode(mode: 'my' | 'all' | 'recent'): void {
    this.viewMode.set(mode);
    this.searchQuery = '';
    this.loadCaptures();
  }

  loadCaptures(): void {
    this.loading.set(true);
    this.error.set(null);
    this.backendWarning.set(false);

    const mode = this.viewMode();

    if (mode === 'my') {
      const trainerId = this.authService.getTrainerId();
      if (!trainerId) {
        this.loading.set(false);
        return;
      }

      // Check cache
      const cached = this.cacheService.getCaptures(`trainer-${trainerId}`);
      if (cached) {
        this.captures.set(cached);
        this.checkBackendWarning(cached);
        this.loading.set(false);
        return;
      }

      this.captureService.getByTrainer(trainerId).subscribe({
        next: (captures) => {
          this.captures.set(captures);
          this.cacheService.setCaptures(`trainer-${trainerId}`, captures);
          this.checkBackendWarning(captures);
          this.loading.set(false);
        },
        error: (err) => this.handleError(err)
      });
    } else if (mode === 'all') {
      // Check cache
      const cached = this.cacheService.getCaptures('all');
      if (cached) {
        this.captures.set(cached);
        this.checkBackendWarning(cached);
        this.loading.set(false);
        return;
      }

      this.captureService.getAll().subscribe({
        next: (captures) => {
          this.captures.set(captures);
          this.cacheService.setCaptures('all', captures);
          this.checkBackendWarning(captures);
          this.loading.set(false);
        },
        error: (err) => this.handleError(err)
      });
    } else {
      this.jmsService.getRecentCaptures(50).subscribe({
        next: (messages) => {
          this.jmsCaptures.set(messages);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Service JMS indisponible. Vérifiez qu\'il tourne sur le port 8081.');
        }
      });
    }
  }

  private checkBackendWarning(captures: CaughtPokemon[]): void {
    // Check if backend returned incomplete data
    if (captures.length > 0 && !captures[0].pokemon) {
      this.backendWarning.set(true);
    }
  }

  private handleError(err: any): void {
    this.loading.set(false);
    console.error('Error loading captures:', err);
    if (err.status === 401) {
      this.error.set('Session expirée. Veuillez vous reconnecter.');
    } else {
      this.error.set('Erreur lors du chargement des captures.');
    }
  }

  getPokeApiSprite(pokemonId: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
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

  onSortChange(event: { key: string; desc: boolean }): void {
    this.sortKey = event.key;
    this.sortDesc = event.desc;
  }

  releasePokemon(capture: CaughtPokemon): void {
    const name = capture.pokemon?.name || `Pokémon #${capture.id}`;
    if (confirm(`Êtes-vous sûr de vouloir relâcher ${name} ?`)) {
      this.captureService.delete(capture.id).subscribe({
        next: () => {
          this.captures.update(captures => 
            captures.filter(c => c.id !== capture.id)
          );
          this.cacheService.invalidateCaptures();
        },
        error: (err) => {
          console.error('Erreur lors de la libération:', err);
        }
      });
    }
  }
}
