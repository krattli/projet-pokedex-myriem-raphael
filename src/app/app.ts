import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { TcgCardModalComponent } from './shared/components/tcg-card-modal/tcg-card-modal.component';
import { PokemonTcgService } from './core/services/pokemon-tcg.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, TcgCardModalComponent],
  template: `
    <app-header />
    <main class="main-content">
      <router-outlet />
    </main>
    
    <!-- Modal TCG global - au niveau de l'app pour couvrir tout l'écran -->
    @if (tcgService.selectedCard()) {
      <app-tcg-card-modal 
        [card]="tcgService.selectedCard()!" 
        (closeModal)="tcgService.closeCard()" 
      />
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .main-content {
      flex: 1;
      background: transparent;
    }
  `]
})
export class App {
  title = 'Pokédex';
  tcgService = inject(PokemonTcgService);
}
