import { Component, Input } from '@angular/core';
import { TYPE_COLORS } from '../../../core/models/type.model';

@Component({
  selector: 'app-type-badge',
  standalone: true,
  templateUrl: './type-badge.component.html',
  styleUrls: ['./type-badge.component.css']
})
export class TypeBadgeComponent {
  @Input({ required: true }) typeName!: string;

  getColor(): string {
    return TYPE_COLORS[this.typeName] || '#888888';
  }
}
