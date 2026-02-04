import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-pokedex-tabs',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './pokedex-tabs.component.html',
  styleUrls: ['./pokedex-tabs.component.css']
})
export class PokedexTabsComponent {
  @Input() activeTab: 'search' | 'pokemon' | 'types' | 'captures' | 'compare' = 'search';

  authService = inject(AuthService);
  private router = inject(Router);

  navigate(tab: 'search' | 'pokemon' | 'types' | 'captures' | 'compare'): void {
    switch (tab) {
      case 'search':
        this.router.navigate(['/']);
        break;
      case 'pokemon':
        this.router.navigate(['/pokedex']);
        break;
      case 'types':
        this.router.navigate(['/types']);
        break;
      case 'captures':
        this.router.navigate(['/captures']);
        break;
      case 'compare':
        this.router.navigate(['/compare']);
        break;
    }
  }
}
