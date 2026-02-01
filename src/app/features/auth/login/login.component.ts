import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.error.set('Veuillez remplir tous les champs');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.router.navigate(['/pokedex']);
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Login error:', err);
        
        if (err.status === 0) {
          this.error.set('Impossible de contacter le serveur. Vérifiez que le backend est lancé.');
        } else if (err.status === 401) {
          this.error.set('Email ou mot de passe incorrect');
        } else if (err.status === 404) {
          this.error.set('Endpoint non trouvé. Vérifiez la configuration de l\'API.');
        } else {
          this.error.set(err.error?.message || err.message || `Erreur ${err.status}: ${err.statusText}`);
        }
      }
    });
  }
}
