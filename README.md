# Pokédex Frontend - Angular 21

Application web Angular pour un Pokédex, connectée à une API REST Jakarta EE.

## 🚀 Quick Start

### Prérequis
- Node.js v18+ (v25 fonctionne avec warnings)
- Backend Pokédex tournant sur `localhost:8080`
- (Optionnel) JMS Consumer sur `localhost:8081`

### Lancer le projet
```bash
npm install
npm start
```
➡️ Ouvre http://localhost:4200

### Identifiants de test
```
Email: ash@pokemon.com
Mot de passe: password1
```
*(Ces utilisateurs sont créés par le script `populate-db.sh` du backend)*

---

## 📁 Structure du Projet

```
src/
├── app/
│   ├── core/                           # Singleton services, guards, models
│   │   ├── guards/
│   │   │   └── auth.guard.ts           # Protection des routes authentifiées
│   │   ├── models/                     # Interfaces TypeScript
│   │   │   ├── capture.model.ts
│   │   │   ├── pokemon.model.ts
│   │   │   ├── trainer.model.ts
│   │   │   ├── type.model.ts
│   │   │   └── index.ts
│   │   └── services/                   # Services HTTP
│   │       ├── auth.service.ts         # Login/Register/Logout + état connexion
│   │       ├── capture.service.ts      # CRUD captures + endpoints JMS
│   │       ├── config.service.ts       # Chargement config externe
│   │       ├── jms.service.ts          # Endpoints JMS Consumer (port 8081)
│   │       ├── pokemon.service.ts      # CRUD Pokémon + compare
│   │       ├── trainer.service.ts      # CRUD Trainers + stats
│   │       ├── type.service.ts         # CRUD Types
│   │       └── index.ts
│   │
│   ├── features/                       # Pages/Fonctionnalités
│   │   ├── auth/
│   │   │   ├── login/                  # Page connexion
│   │   │   └── register/               # Page inscription
│   │   ├── captures/
│   │   │   └── captures-list/          # Mes captures / Toutes / JMS Recent
│   │   ├── home/                       # Page d'accueil avec recherche
│   │   ├── pokedex/
│   │   │   ├── pokemon-compare/        # Comparaison de stats
│   │   │   ├── pokemon-detail/         # Fiche détaillée
│   │   │   └── pokemon-list/           # Liste avec filtres
│   │   ├── trainer/
│   │   │   └── trainer-profile/        # Profil + stats dresseur
│   │   └── types/
│   │       └── type-list/              # Liste des types
│   │
│   ├── shared/                         # Composants réutilisables
│   │   └── components/
│   │       ├── header/                 # Navbar principale
│   │       ├── pokedex-tabs/           # Tabbar Search|Pokemon|Types|Captures
│   │       ├── pokemon-card/           # Carte Pokémon avec sprite
│   │       ├── stat-bar/               # Barre de progression stats
│   │       └── type-badge/             # Badge coloré pour les types
│   │
│   ├── app.config.ts                   # Config Angular + APP_INITIALIZER
│   ├── app.routes.ts                   # Définition des routes
│   └── app.ts                          # Composant racine
│
├── assets/
│   └── config.json                     # ⚙️ URLs API (modifiable sans rebuild)
│
├── environments/                       # Environnements (legacy, non utilisé)
└── styles.css                          # Styles globaux Pokemon Showdown
```

---

## ⚙️ Configuration

### Fichier `src/assets/config.json`
```json
{
  "apiUrl": "http://localhost:8080/api",
  "jmsApiUrl": "http://localhost:8081/api"
}
```
Ce fichier est chargé au démarrage via `ConfigService`. Tu peux le modifier sans recompiler.

---

## 🛣️ Routes

| Route | Composant | Auth requise | Description |
|-------|-----------|--------------|-------------|
| `/` | HomeComponent | Non | Accueil + recherche Pokémon |
| `/login` | LoginComponent | Non | Connexion |
| `/register` | RegisterComponent | Non | Inscription |
| `/pokedex` | PokemonListComponent | Non* | Liste des Pokémon |
| `/pokedex/:id` | PokemonDetailComponent | Non* | Détail d'un Pokémon |
| `/types` | TypeListComponent | Non* | Liste des types |
| `/captures` | CapturesListComponent | Non* | Mes captures / Toutes / JMS |
| `/compare` | PokemonCompareComponent | Oui | Comparer des Pokémon |
| `/profile` | TrainerProfileComponent | Oui | Profil du dresseur |

*\* L'API backend requiert l'authentification, donc ces pages affichent un message si non connecté.*

---

## 🔌 Endpoints API Implémentés

### Backend Principal (port 8080)

#### Auth
| Méthode | Endpoint | Service | Utilisé dans |
|---------|----------|---------|--------------|
| POST | `/auth/register` | `auth.service.ts` | RegisterComponent |
| POST | `/auth/login` | `auth.service.ts` | LoginComponent |
| POST | `/auth/logout` | `auth.service.ts` | HeaderComponent |

#### Trainers
| Méthode | Endpoint | Service | Utilisé dans |
|---------|----------|---------|--------------|
| GET | `/trainers` | `trainer.service.ts` | - |
| GET | `/trainers/{id}` | `trainer.service.ts` | - |
| POST | `/trainers` | `trainer.service.ts` | - |
| PUT | `/trainers/{id}` | `trainer.service.ts` | - |
| DELETE | `/trainers/{id}` | `trainer.service.ts` | - |
| GET | `/trainers/{id}/stats` | `trainer.service.ts` | TrainerProfileComponent |

#### Pokémons
| Méthode | Endpoint | Service | Utilisé dans |
|---------|----------|---------|--------------|
| GET | `/pokemons` | `pokemon.service.ts` | PokemonListComponent, HomeComponent |
| GET | `/pokemons/{id}` | `pokemon.service.ts` | PokemonDetailComponent |
| POST | `/pokemons` | `pokemon.service.ts` | - |
| PUT | `/pokemons/{id}` | `pokemon.service.ts` | - |
| DELETE | `/pokemons/{id}` | `pokemon.service.ts` | - |
| POST | `/pokemons/compare` | `pokemon.service.ts` | PokemonCompareComponent |

#### Types
| Méthode | Endpoint | Service | Utilisé dans |
|---------|----------|---------|--------------|
| GET | `/types` | `type.service.ts` | TypeListComponent |
| GET | `/types/{id}` | `type.service.ts` | - |
| POST | `/types` | `type.service.ts` | - |
| PUT | `/types/{id}` | `type.service.ts` | - |
| DELETE | `/types/{id}` | `type.service.ts` | - |

#### Captures (CaughtPokemons)
| Méthode | Endpoint | Service | Utilisé dans |
|---------|----------|---------|--------------|
| GET | `/caught-pokemons` | `capture.service.ts` | CapturesListComponent |
| GET | `/caught-pokemons/{id}` | `capture.service.ts` | - |
| GET | `/caught-pokemons/trainer/{id}` | `capture.service.ts` | CapturesListComponent |
| GET | `/caught-pokemons/pokemon/{id}` | `capture.service.ts` | - |
| POST | `/caught-pokemons` | `capture.service.ts` | PokemonCardComponent |
| DELETE | `/caught-pokemons/{id}` | `capture.service.ts` | CapturesListComponent |

### JMS Consumer (port 8081)

| Méthode | Endpoint | Service | Utilisé dans |
|---------|----------|---------|--------------|
| GET | `/health` | `jms.service.ts` | - |
| GET | `/captures` | `jms.service.ts` | - |
| GET | `/captures/recent` | `jms.service.ts` | CapturesListComponent |
| GET | `/captures/stats` | `jms.service.ts` | - |
| GET | `/creations` | `jms.service.ts` | - |
| GET | `/creations/recent` | `jms.service.ts` | - |
| GET | `/creations/stats` | `jms.service.ts` | - |
| GET | `/aggregated/stats` | `jms.service.ts` | - |
| GET | `/aggregated/stats/trainer/{id}` | `jms.service.ts` | - |

---

## 🎨 Style

Le design est inspiré de **Pokemon Showdown** :
- Header bleu-gris avec gradient
- Boutons avec effets de gradient et hover
- Tabbar avec onglets Search/Pokemon/Types/Captures
- Sprites Pokémon via PokeAPI : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{pokedexNumber}.png`
- Couleurs des types définies dans `src/app/core/models/type.model.ts`

---

## 🔐 Authentification

Le backend utilise des **sessions HTTP** avec cookies JSESSIONID :

1. **Login** → Le backend crée une session et renvoie un cookie
2. **Requêtes suivantes** → Le cookie est envoyé automatiquement (`withCredentials: true`)
3. **Stockage local** → Les infos du trainer sont sauvées dans `localStorage` pour persister la session côté front

Le `AuthService` expose :
- `currentTrainer()` - Signal avec les infos du dresseur connecté
- `isLoggedIn()` - Signal computed boolean
- `getTrainerId()` - Retourne l'ID du dresseur ou null

---

## 📝 Notes pour le développement

### Ajouter une nouvelle page
1. Créer le composant dans `features/`
2. Ajouter la route dans `app.routes.ts`
3. Utiliser `PokedexTabsComponent` si c'est une page du Pokédex

### Ajouter un nouvel endpoint API
1. Ajouter la méthode dans le service approprié (`core/services/`)
2. Les services utilisent `ConfigService` pour les URLs

### Modèles TypeScript
Tous les modèles sont dans `core/models/` et exportés via `index.ts`

---

## 🛠️ Commandes

```bash
# Développement
npm start                    # Lance le serveur dev sur :4200

# Build
npm run build                # Build production dans dist/

# Tests
npm test                     # Tests unitaires avec Vitest
```

---

## 📋 TODO / Améliorations possibles

- [ ] Page admin pour CRUD Pokémon/Types (les endpoints existent déjà)
- [ ] Afficher les types sur les Pokémon (le backend renvoie `types: []` vide)
- [ ] Page de détail d'un Type avec les Pokémon associés
- [ ] Notifications toast au lieu des messages inline
- [ ] Mode hors-ligne avec cache
- [ ] Tests unitaires
- [ ] Responsive mobile amélioré

---

## 📚 Documentation Backend

La documentation complète du backend est dans `documentation_back/` :
- `01-problematique-et-fonctionnalites.md` - Contexte et features
- `02-architecture-patterns.md` - Architecture et design patterns
- `03-scenario-flux.md` - Flux de données complet
- `05-documentation-technique.md` - Sécurité et choix techniques
- `README_backend.md` - Quick start et liste des endpoints
