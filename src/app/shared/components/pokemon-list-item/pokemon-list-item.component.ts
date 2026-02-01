import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Pokemon } from '../../../core/models';

@Component({
  selector: 'app-pokemon-list-item',
  standalone: true,
  templateUrl: './pokemon-list-item.component.html',
  styleUrls: ['./pokemon-list-item.component.css']
})
export class PokemonListItemComponent {
  @Input({ required: true }) pokemon!: Pokemon;
  @Input() showCaptureButton = false;
  @Input() isSelected = false;
  @Output() capture = new EventEmitter<Pokemon>();
  @Output() select = new EventEmitter<Pokemon>();

  getSpriteUrl(): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${this.pokemon.pokedexNumber}.png`;
  }

  getTypeImageUrl(typeName: string): string {
    return `https://play.pokemonshowdown.com/sprites/types/${typeName}.png`;
  }

  onIconError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect fill="%23eee" width="40" height="40"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="10">?</text></svg>';
  }

  onTypeImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  getBST(): number {
    return this.pokemon.hp + this.pokemon.attack + this.pokemon.defense + this.pokemon.speed;
  }

  onSelect(): void {
    this.select.emit(this.pokemon);
  }

  onCapture(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.capture.emit(this.pokemon);
  }
}
