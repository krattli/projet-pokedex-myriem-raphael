import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CaughtPokemon } from '../../../core/models';

@Component({
  selector: 'app-capture-list-item',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './capture-list-item.component.html',
  styleUrls: ['./capture-list-item.component.css']
})
export class CaptureListItemComponent {
  @Input({ required: true }) capture!: CaughtPokemon;
  @Input() showTrainer = false;
  @Input() showReleaseButton = false;
  @Output() release = new EventEmitter<CaughtPokemon>();

  getSpriteUrl(): string {
    const num = this.capture.pokemon?.pokedexNumber || 0;
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png`;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  onRelease(): void {
    this.release.emit(this.capture);
  }
}
