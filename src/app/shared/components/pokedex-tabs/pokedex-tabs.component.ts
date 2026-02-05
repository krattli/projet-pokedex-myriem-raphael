import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-pokedex-tabs',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './pokedex-tabs.component.html',
  styleUrls: ['./pokedex-tabs.component.css']
})
export class PokedexTabsComponent {
  @Input() activeTab: 'search' | 'pokemon' | 'types' | 'captures' | 'compare' = 'search';

  authService = inject(AuthService);
  private router = inject(Router);

  get tabCount(): number {
    return this.authService.isLoggedIn() ? 5 : 4;
  }

  get activeIndex(): number {
    switch (this.activeTab) {
      case 'search': return 0;
      case 'pokemon': return 1;
      case 'types': return 2;
      case 'captures': return 3;
      case 'compare': return 4;
      default: return 0;
    }
  }

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
