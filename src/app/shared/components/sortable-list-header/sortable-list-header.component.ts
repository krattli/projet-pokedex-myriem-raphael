import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface SortColumn {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-sortable-list-header',
  standalone: true,
  templateUrl: './sortable-list-header.component.html',
  styleUrls: ['./sortable-list-header.component.css']
})
export class SortableListHeaderComponent {
  @Input() columns: SortColumn[] = [];
  @Input() currentSort = '';
  @Input() sortDesc = false;
  @Output() sortChange = new EventEmitter<{ key: string; desc: boolean }>();

  onSort(key: string): void {
    if (this.currentSort === key) {
      this.sortChange.emit({ key, desc: !this.sortDesc });
    } else {
      this.sortChange.emit({ key, desc: false });
    }
  }
}
