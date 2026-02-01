import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'pokedex',
    loadComponent: () => import('./features/pokedex/pokemon-list/pokemon-list.component').then(m => m.PokemonListComponent)
  },
  {
    path: 'pokedex/:id',
    loadComponent: () => import('./features/pokedex/pokemon-detail/pokemon-detail.component').then(m => m.PokemonDetailComponent)
  },
  {
    path: 'types',
    loadComponent: () => import('./features/types/type-list/type-list.component').then(m => m.TypeListComponent)
  },
  {
    path: 'captures',
    loadComponent: () => import('./features/captures/captures-list/captures-list.component').then(m => m.CapturesListComponent)
  },
  {
    path: 'my-captures',
    redirectTo: 'captures',
    pathMatch: 'full'
  },
  {
    path: 'compare',
    loadComponent: () => import('./features/pokedex/pokemon-compare/pokemon-compare.component').then(m => m.PokemonCompareComponent),
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/trainer/trainer-profile/trainer-profile.component').then(m => m.TrainerProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
