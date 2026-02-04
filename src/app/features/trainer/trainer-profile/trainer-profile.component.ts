import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { TrainerService } from '../../../core/services/trainer.service';
import { CaptureService } from '../../../core/services/capture.service';
import { Trainer, TrainerStats, CaughtPokemon } from '../../../core/models';

@Component({
  selector: 'app-trainer-profile',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './trainer-profile.component.html',
  styleUrls: ['./trainer-profile.component.css']
})
export class TrainerProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private trainerService = inject(TrainerService);
  private captureService = inject(CaptureService);
  private router = inject(Router);

  trainer = signal<Trainer | null>(null);
  trainerStats = signal<TrainerStats | null>(null);
  captures = signal<CaughtPokemon[]>([]);
  loading = signal(true);
  
  // Édition du pseudo
  editingName = signal(false);
  newName = signal('');
  updatingName = signal(false);
  
  // Suppression du compte
  deletingAccount = signal(false);
  showDeleteModal = false;

  ngOnInit(): void {
    this.trainer.set(this.authService.currentTrainer());
    const trainerId = this.authService.getTrainerId();
    if (trainerId) {
      this.loadStats(trainerId);
      this.loadCaptures(trainerId);
    } else {
      this.loading.set(false);
    }
  }

  loadStats(trainerId: number): void {
    this.trainerService.getStats(trainerId).subscribe({
      next: (stats) => {
        this.trainerStats.set(stats);
      },
      error: () => {
        // Si les stats ne sont pas disponibles, on continue sans
      }
    });
  }

  loadCaptures(trainerId: number): void {
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
    // Utiliser les stats si disponibles (plus fiable)
    const stats = this.trainerStats();
    if (stats) {
      return stats.uniquePokemons;
    }
    
    // Sinon, calculer depuis les captures en utilisant pokemonId
    const ids = new Set(
      this.captures()
        .filter(c => c.pokemonId !== undefined || c.pokemon?.id !== undefined)
        .map(c => c.pokemonId ?? c.pokemon!.id)
    );
    return ids.size;
  }

  uniqueTypes(): number {
    // Si on a les stats, utiliser uniquePokemons depuis les stats
    // Sinon, essayer de calculer depuis les captures
    const stats = this.trainerStats();
    if (stats) {
      // Compter les types uniques depuis capturesByType
      return Object.keys(stats.capturesByType || {}).length;
    }
    
    // Fallback : calculer depuis les captures si pokemon est chargé
    const types = new Set<number>();
    this.captures().forEach(c => {
      if (c.pokemon?.types) {
        c.pokemon.types.forEach(t => types.add(t.id));
      }
    });
    return types.size;
  }

  getSpriteUrl(pokedexNumber: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokedexNumber}.png`;
  }

  // Édition du pseudo
  startEditingName(): void {
    this.newName.set(this.trainer()?.name || '');
    this.editingName.set(true);
  }

  cancelEditingName(): void {
    this.editingName.set(false);
    this.newName.set('');
  }

  saveName(): void {
    const trainerId = this.authService.getTrainerId();
    const newNameValue = this.newName().trim();
    
    if (!trainerId || !newNameValue || newNameValue === this.trainer()?.name) {
      this.cancelEditingName();
      return;
    }

    this.updatingName.set(true);
    this.trainerService.update(trainerId, { name: newNameValue }).subscribe({
      next: (updatedTrainer) => {
        // Mettre à jour le trainer dans localStorage
        localStorage.setItem('currentTrainer', JSON.stringify(updatedTrainer));
        // Mettre à jour le trainer localement
        this.trainer.set(updatedTrainer);
        this.editingName.set(false);
        this.newName.set('');
        this.updatingName.set(false);
        
        // Recharger les stats pour mettre à jour le nom dans les stats
        const currentTrainerId = this.authService.getTrainerId();
        if (currentTrainerId) {
          this.loadStats(currentTrainerId);
        }
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour du nom:', err);
        alert('Erreur lors de la mise à jour du nom. Veuillez réessayer.');
        this.updatingName.set(false);
      }
    });
  }

  // Suppression du compte
  confirmDeleteAccount(): void {
    const trainerId = this.authService.getTrainerId();
    if (!trainerId) return;

    this.deletingAccount.set(true);
    this.showDeleteModal = false;
    
    this.trainerService.delete(trainerId).subscribe({
      next: () => {
        // Déconnexion et redirection
        this.authService.logout().subscribe(() => {
          this.router.navigate(['/']);
        });
      },
      error: (err) => {
        console.error('Erreur lors de la suppression du compte:', err);
        alert('Erreur lors de la suppression du compte. Veuillez réessayer.');
        this.deletingAccount.set(false);
      }
    });
  }

  // Calculs supplémentaires
  pokedexCompletion(): number {
    const stats = this.trainerStats();
    return stats?.pokedexCompletionPercentage || 0;
  }

  firstCaptureDate(): string | null {
    const captures = this.captures();
    if (captures.length === 0) return null;
    
    const dates = captures
      .map(c => new Date(c.captureDate).getTime())
      .filter(t => !isNaN(t));
    
    if (dates.length === 0) return null;
    
    const firstDate = new Date(Math.min(...dates));
    return firstDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  mostCapturedType(): string | null {
    const stats = this.trainerStats();
    if (!stats || !stats.capturesByType || Object.keys(stats.capturesByType).length === 0) {
      return null;
    }
    
    const entries = Object.entries(stats.capturesByType);
    const maxEntry = entries.reduce((max, current) => 
      current[1] > max[1] ? current : max
    );
    
    return maxEntry[0];
  }
}
