import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SortableListHeaderComponent, SortColumn } from '../sortable-list-header/sortable-list-header.component';

@Component({
  selector: 'app-searchable-list',
  standalone: true,
  imports: [FormsModule, SortableListHeaderComponent],
  templateUrl: './searchable-list.component.html',
  styleUrls: ['./searchable-list.component.css']
})
export class SearchableListComponent {
  @Input() searchPlaceholder = 'Rechercher...';
  @Input() searchQuery = '';
  @Input() totalCount = 0;
  @Input() filteredCount = 0;
  @Input() itemLabel = 'éléments';
  @Input() columns: SortColumn[] = [];
  @Input() currentSort = '';
  @Input() sortDesc = false;

  @Output() searchChange = new EventEmitter<string>();
  @Output() sortChange = new EventEmitter<{ key: string; desc: boolean }>();

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.searchChange.emit(query);
  }

  onSortChange(event: { key: string; desc: boolean }): void {
    this.sortChange.emit(event);
  }
}
