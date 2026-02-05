import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TypeService } from '../../../core/services/type.service';
import { AuthService } from '../../../core/services/auth.service';
import { CacheService } from '../../../core/services/cache.service';
import { Type } from '../../../core/models/type.model';
import { TypeListItemComponent } from '../../../shared/components/type-list-item/type-list-item.component';
import { SearchableListComponent } from '../../../shared/components/searchable-list/searchable-list.component';
import { SortColumn } from '../../../shared/components/sortable-list-header/sortable-list-header.component';
import { PokedexTabsComponent } from '../../../shared/components/pokedex-tabs/pokedex-tabs.component';

@Component({
  selector: 'app-type-list',
  standalone: true,
  imports: [RouterLink, TypeListItemComponent, SearchableListComponent, PokedexTabsComponent],
  templateUrl: './type-list.component.html',
  styleUrls: ['./type-list.component.css']
})
export class TypeListComponent implements OnInit {
  private typeService = inject(TypeService);
  private cacheService = inject(CacheService);
  authService = inject(AuthService);

  types = signal<Type[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  searchQuery = signal('');
  sortKey = signal<'name'>('name');
  sortDesc = signal(false);

  columns: SortColumn[] = [
    { key: 'badge', label: 'Type', width: '80px', sortable: false },
    { key: 'name', label: 'Nom' }
  ];

  filteredTypes = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.types();
    
    return this.types().filter(t => 
      t.name.toLowerCase().includes(query)
    );
  });

  sortedTypes = computed(() => {
    const filtered = this.filteredTypes();
    const desc = this.sortDesc();

    return [...filtered].sort((a, b) => {
      return desc 
        ? b.name.localeCompare(a.name) 
        : a.name.localeCompare(b.name);
    });
  });

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.loadTypes();
    } else {
      this.loading.set(false);
    }
  }

  loadTypes(): void {
    const cached = this.cacheService.getTypes();
    if (cached) {
      this.types.set(cached);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    
    this.typeService.getAll().subscribe({
      next: (types) => {
        this.types.set(types);
        this.cacheService.setTypes(types);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Error loading types:', err);
        if (err.status === 401) {
          this.error.set('Vous devez être connecté pour voir les types.');
        } else {
          this.error.set('Erreur lors du chargement des types.');
        }
      }
    });
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  onSortChange(event: { key: string; desc: boolean }): void {
    this.sortKey.set(event.key as 'name');
    this.sortDesc.set(event.desc);
  }
}
