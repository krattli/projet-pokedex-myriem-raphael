import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { Pokemon } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { CaptureService } from '../../../core/services/capture.service';
import { CacheService } from '../../../core/services/cache.service';
import { TypeBadgeComponent } from '../type-badge/type-badge.component';
import { StatBarComponent } from '../stat-bar/stat-bar.component';

@Component({
  selector: 'app-pokemon-detail-panel',
  standalone: true,
  imports: [TypeBadgeComponent, StatBarComponent],
  templateUrl: './pokemon-detail-panel.component.html',
  styleUrls: ['./pokemon-detail-panel.component.css']
})
export class PokemonDetailPanelComponent {
  @Input({ required: true }) pokemon!: Pokemon;
  @Output() close = new EventEmitter<void>();
  @Output() captured = new EventEmitter<Pokemon>();

  authService = inject(AuthService);
  private captureService = inject(CaptureService);
  private cacheService = inject(CacheService);

  successMessage: string | null = null;

  getSpriteUrl(): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${this.pokemon.pokedexNumber}.png`;
  }

  getTotalStats(): number {
    return this.pokemon.hp + this.pokemon.attack + this.pokemon.defense + this.pokemon.speed;
  }

  capture(): void {
    const trainerId = this.authService.getTrainerId();
    if (!trainerId) return;

    if (!confirm(`Êtes-vous sûr de vouloir capturer ${this.pokemon.name} ?\nIl sera ajouté à votre Pokédex.`)) {
      return;
    }

    this.captureService.capture({ trainerId, pokemonId: this.pokemon.id }).subscribe({
      next: () => {
        this.successMessage = `${this.pokemon.name} capturé !`;
        this.cacheService.invalidateCaptures();
        this.captured.emit(this.pokemon);
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (err) => {
        console.error('Erreur lors de la capture:', err);
      }
    });
  }
}
