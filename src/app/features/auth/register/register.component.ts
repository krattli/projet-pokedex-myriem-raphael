import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  loading = signal(false);
  error = signal<string | null>(null);

  onSubmit(): void {
    if (!this.name || !this.email || !this.password || !this.confirmPassword) {
      this.error.set('Veuillez remplir tous les champs');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error.set('Les mots de passe ne correspondent pas');
      return;
    }

    if (this.password.length < 6) {
      this.error.set('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.authService.register({ 
      name: this.name, 
      email: this.email, 
      password: this.password 
    }).subscribe({
      next: () => {
        this.router.navigate(['/pokedex']);
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Register error:', err);
        
        if (err.status === 0) {
          this.error.set('Impossible de contacter le serveur. Vérifiez que le backend est lancé.');
        } else if (err.status === 409) {
          this.error.set('Cet email est déjà utilisé');
        } else if (err.status === 404) {
          this.error.set('Endpoint non trouvé. Vérifiez la configuration de l\'API.');
        } else {
          this.error.set(err.error?.message || err.message || `Erreur ${err.status}: ${err.statusText}`);
        }
      }
    });
  }
}
