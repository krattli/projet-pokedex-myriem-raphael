import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pokemon } from '../../../core/models';
import { TypeBadgeComponent } from '../type-badge/type-badge.component';

@Component({
  selector: 'app-pokemon-card',
  standalone: true,
  imports: [RouterLink, TypeBadgeComponent],
  templateUrl: './pokemon-card.component.html',
  styleUrls: ['./pokemon-card.component.css']
})
export class PokemonCardComponent {
  @Input({ required: true }) pokemon!: Pokemon;
  @Input() showCaptureButton = false;
  @Output() capture = new EventEmitter<Pokemon>();

  getSpriteUrl(): string {
    // Using PokeAPI sprites
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${this.pokemon.pokedexNumber}.png`;
  }

  onCapture(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.capture.emit(this.pokemon);
  }
}
