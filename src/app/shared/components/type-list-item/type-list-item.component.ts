import { Component, Input } from '@angular/core';
import { Type, TYPE_COLORS } from '../../../core/models/type.model';

@Component({
  selector: 'app-type-list-item',
  standalone: true,
  templateUrl: './type-list-item.component.html',
  styleUrls: ['./type-list-item.component.css']
})
export class TypeListItemComponent {
  @Input({ required: true }) type!: Type;

  getTypeImageUrl(): string {
    return `https://play.pokemonshowdown.com/sprites/types/${this.type.name}.png`;
  }

  getColor(): string {
    return TYPE_COLORS[this.type.name] || '#888888';
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
