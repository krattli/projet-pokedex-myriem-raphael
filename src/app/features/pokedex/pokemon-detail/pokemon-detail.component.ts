import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { PokemonService } from '../../../core/services/pokemon.service';
import { AuthService } from '../../../core/services/auth.service';
import { CaptureService } from '../../../core/services/capture.service';
import { Pokemon } from '../../../core/models';
import { TypeBadgeComponent } from '../../../shared/components/type-badge/type-badge.component';
import { StatBarComponent } from '../../../shared/components/stat-bar/stat-bar.component';

@Component({
  selector: 'app-pokemon-detail',
  standalone: true,
  imports: [RouterLink, TypeBadgeComponent, StatBarComponent],
  templateUrl: './pokemon-detail.component.html',
  styleUrls: ['./pokemon-detail.component.css']
})
export class PokemonDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private pokemonService = inject(PokemonService);
  private captureService = inject(CaptureService);
  authService = inject(AuthService);

  pokemon = signal<Pokemon | null>(null);
  loading = signal(true);
  successMessage = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPokemon(+id);
    } else {
      this.loading.set(false);
    }
  }

  loadPokemon(id: number): void {
    this.pokemonService.getById(id).subscribe({
      next: (pokemon) => {
        this.pokemon.set(pokemon);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  getSpriteUrl(): string {
    const p = this.pokemon();
    if (!p) return '';
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.pokedexNumber}.png`;
  }

  getTotalStats(): number {
    const p = this.pokemon();
    if (!p) return 0;
    return p.hp + p.attack + p.defense + p.speed;
  }

  capture(): void {
    const p = this.pokemon();
    const trainerId = this.authService.getTrainerId();
    if (!p || !trainerId) return;

    this.captureService.capture({ trainerId, pokemonId: p.id }).subscribe({
      next: () => {
        this.successMessage.set(`${p.name} a été capturé avec succès !`);
      },
      error: (err) => {
        console.error('Erreur lors de la capture:', err);
      }
    });
  }

  goBack(): void {
    // Vérifier si on peut revenir en arrière
    if (window.history.length > 1) {
      this.location.back();
    } else {
      // Fallback : rediriger vers la page d'accueil
      this.router.navigate(['/']);
    }
  }
}
