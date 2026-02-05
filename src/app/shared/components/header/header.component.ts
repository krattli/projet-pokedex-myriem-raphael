import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PokedexTabsComponent } from '../pokedex-tabs/pokedex-tabs.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, PokedexTabsComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/']);
    });
  }

  get activeTab(): 'search' | 'pokemon' | 'types' | 'captures' | 'compare' {
    const url = this.router.url;
    if (url === '/' || url.startsWith('/home')) return 'search';
    if (url.startsWith('/pokedex') && !url.startsWith('/pokedex/compare')) return 'pokemon';
    if (url.startsWith('/types')) return 'types';
    if (url.startsWith('/captures')) return 'captures';
    if (url.startsWith('/compare')) return 'compare';
    return 'search';
  }
}
