import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TrainerService } from '../../../core/services/trainer.service';
import { CaptureService } from '../../../core/services/capture.service';
import { Trainer, TrainerStats, CaughtPokemon } from '../../../core/models';

@Component({
  selector: 'app-trainer-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './trainer-profile.component.html',
  styleUrls: ['./trainer-profile.component.css']
})
export class TrainerProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private trainerService = inject(TrainerService);
  private captureService = inject(CaptureService);

  trainer = signal<Trainer | null>(null);
  captures = signal<CaughtPokemon[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.trainer.set(this.authService.currentTrainer());
    this.loadCaptures();
  }

  loadCaptures(): void {
    const trainerId = this.authService.getTrainerId();
    if (!trainerId) {
      this.loading.set(false);
      return;
    }

    this.captureService.getByTrainer(trainerId).subscribe({
      next: (captures) => {
        this.captures.set(captures);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  recentCaptures(): CaughtPokemon[] {
    return this.captures()
      .sort((a, b) => new Date(b.captureDate).getTime() - new Date(a.captureDate).getTime())
      .slice(0, 6);
  }

  uniquePokemons(): number {
    const ids = new Set(
      this.captures()
        .filter(c => c.pokemon)
        .map(c => c.pokemon!.id)
    );
    return ids.size;
  }

  uniqueTypes(): number {
    const types = new Set<number>();
    this.captures().forEach(c => {
      c.pokemon?.types?.forEach(t => types.add(t.id));
    });
    return types.size;
  }

  getSpriteUrl(pokedexNumber: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokedexNumber}.png`;
  }
}
