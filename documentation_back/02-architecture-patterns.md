# Architecture et Design Patterns

## 1. Architecture Globale

L'application est construite selon une architecture en couches basée sur Jakarta EE.

### 1.1 Vue d'Ensemble

L'application est composée de deux modules principaux :

1. **Module Principal (pokedex-back)** : Application Jakarta EE contenant l'API REST, la logique métier, la persistance et les producteurs JMS
2. **Module Consumer JMS (pokedex-jms-consumer)** : Application Jakarta EE séparée dédiée à la consommation et au traitement des messages JMS

### 1.2 Couches de l'Architecture

#### Couche Rest (REST - JAX-RS)

Responsable de l'exposition des services via une API REST.

**Composants :**
- `AuthResource` : Authentification (register, login, logout)
- `TrainerResource` : Gestion des dresseurs (CRUD + statistiques)
- `PokemonResource` : Gestion des Pokémon (CRUD + comparaison)
- `TypeResource` : Gestion des types élémentaires (CRUD)
- `CaughtPokemonResource` : Gestion des captures (CRUD + recherche)

**Technologies :** JAX-RS (Jersey), JSON-B pour la sérialisation

#### Couche Service (EJB - Business Logic)

Contient la logique métier de l'application.

**Composants :**
- `AuthService` : Authentification et gestion des sessions
- `TrainerService` : Logique métier des dresseurs
- `PokemonService` : Logique métier des Pokémon
- `TypeService` : Logique métier des types
- `CaughtPokemonService` : Logique métier des captures
- `TrainerStatsService` : Calcul des statistiques des dresseurs
- `PokemonComparisonService` : Comparaison de Pokémon

**Technologies :** EJB Stateless (@Stateless), CDI pour l'injection de dépendances

#### Couche Persistence (JPA)

Gère la persistance des données dans la base de données PostgreSQL.

**Entités :**
- `Trainer` : Dresseur (id, name, email, password)
- `Pokemon` : Pokémon (id, pokedexNumber, name, hp, attack, defense, speed)
- `Type` : Type élémentaire (id, name)
- `CaughtPokemon` : Capture (id, trainer, pokemon, captureDate)

**Relations :**
- Trainer 1-N CaughtPokemon
- Pokemon 1-N CaughtPokemon
- Pokemon N-N Type

**Technologies :** JPA/Hibernate, PostgreSQL

#### Couche Messaging (JMS)

Gère l'envoi asynchrone de messages via ActiveMQ Artemis.

**Composants :**
- `CaptureMessageProducer` : Envoie des messages lors d'une capture
- `TrainerMessageProducer` : Envoie des messages lors de la création d'un dresseur

**Technologies :** JMS, ActiveMQ Artemis

**Choix Queue vs Topic :**

Le système utilise des **Queues** (point-to-point) plutôt que des **Topics** (publish-subscribe) pour les raisons suivantes :

- **Traitement unique** : Chaque événement (capture, création de dresseur) doit être traité une seule fois par le module consumer. Avec une queue, un seul consommateur reçoit chaque message, garantissant un traitement unique.

- **Garantie de livraison** : Les queues garantissent que chaque message est livré exactement une fois à un consommateur. Si le consommateur tombe en panne, les messages restent dans la queue et seront traités au redémarrage.

- **Ordre de traitement** : Les queues préservent l'ordre d'arrivée des messages, ce qui est important pour la cohérence des statistiques et de la journalisation.

- **Simplicité** : Dans le contexte actuel, un seul consommateur est nécessaire. L'utilisation de topics serait appropriée si plusieurs consommateurs indépendants devaient traiter les mêmes événements (par exemple, un pour la journalisation, un autre pour les notifications, un autre pour les statistiques).

Si à l'avenir plusieurs consommateurs indépendants doivent traiter les mêmes événements, une migration vers des topics serait envisageable.

#### Module Consumer JMS

Application séparée qui consomme et traite les messages JMS.

**Composants :**
- `JmsMessageListener` : Consommateur JMS qui écoute les queues
- `MessageLogService` : Stockage en mémoire des messages reçus
- `CaptureAggregator` : Agrégation des messages de capture
- `CapturesResource` : API REST pour consulter les captures
- `CreationsResource` : API REST pour consulter les créations de dresseurs
- `AggregatedStatsResource` : API REST pour les statistiques agrégées

**Technologies :** JMS, EJB Singleton (@Singleton @Startup)


## 2. Design Patterns Implémentés

### 2.1 Event Message Pattern

**Description :** Encapsule un événement survenu dans le système dans un message.

**Implémentation :**

Deux types de messages événementiels sont utilisés :

1. **CaptureMessage** : Transmet l'événement de capture d'un Pokémon
   - Contient : trainerId, trainerName, pokemonId, pokemonName, captureDate
   - Envoyé lors de la création d'un `CaughtPokemon`

2. **TrainerMessage** : Transmet l'événement de création d'un dresseur
   - Contient : trainerId, trainerName, trainerEmail, registrationDate
   - Envoyé lors de l'inscription d'un nouveau dresseur

**Justification :**

Ce pattern permet de découpler l'action métier (capture, création de compte) du traitement asynchrone (journalisation, statistiques, notifications). L'application principale n'a pas besoin d'attendre que tous les traitements secondaires soient terminés, améliorant ainsi les performances et la scalabilité.


### 2.2 Content-based Router Pattern

**Description :** Route les messages vers différents handlers selon le contenu du message.

**Implémentation :**

Le `JmsMessageListener` écoute deux queues distinctes ("captures" et "trainers") et route chaque message vers le handler approprié :

- Messages de la queue "captures" → `handleCaptureMessage()`
- Messages de la queue "trainers" → `handleTrainerMessage()`

Chaque handler vérifie également le type de l'objet contenu dans le message (instanceof) pour s'assurer qu'il traite le bon type de message.

**Justification :**

Ce pattern permet de traiter différemment les différents types d'événements sans avoir besoin d'un seul handler monolithique. Chaque type d'événement peut avoir sa propre logique de traitement, facilitant la maintenance et l'évolution du système.

### 2.3 Message Filter Pattern

**Description :** Filtre les messages selon des critères spécifiques avant traitement.

**Implémentation :**

Dans `JmsMessageListener`, plusieurs niveaux de filtrage sont appliqués :

1. **Filtrage par queue** : Deux consommateurs distincts écoutent des queues différentes
2. **Filtrage par type de message JMS** : Vérification `instanceof ObjectMessage` ou `instanceof BytesMessage`
3. **Filtrage par type d'objet** : Vérification `instanceof CaptureMessage` ou `instanceof TrainerMessage`

Les messages qui ne correspondent pas aux critères sont loggés comme warnings et ignorés.

**Justification :**

Ce pattern garantit que seuls les messages valides et pertinents sont traités, évitant les erreurs de traitement et améliorant la robustesse du système. Il permet également de gérer différents formats de messages (ObjectMessage, BytesMessage) de manière transparente.


### 2.4 Aggregator Pattern

**Description :** Regroupe plusieurs messages individuels en un message agrégé contenant des statistiques.

**Implémentation :**

Le `CaptureAggregator` regroupe les messages de capture (`CaptureMessage`) pour produire des statistiques agrégées :

- **Par dresseur** : `aggregateByTrainer()` regroupe toutes les captures d'un dresseur et calcule :
  - Le nombre total de captures
  - Le nombre de captures par Pokémon
  - Le tri par nombre de captures décroissant

- **Tous dresseurs** : `aggregateAllTrainers()` regroupe toutes les captures de tous les dresseurs et produit une liste de statistiques par dresseur, triée par nombre total de captures.

**Justification :**

Ce pattern permet de transformer une série de messages individuels (chaque capture) en vue agrégée (statistiques). Cela évite de recalculer les statistiques à chaque requête et permet de fournir des vues consolidées utiles pour l'analyse et le reporting.

## 4. Avantages de l'Architecture

- **Découplage** : Les couches sont indépendantes, facilitant la maintenance et les tests
- **Scalabilité** : Le module consumer JMS peut être déployé séparément et multiplié
- **Asynchronicité** : Les traitements secondaires (journalisation, statistiques) n'impactent pas les performances de l'API principale
- **Extensibilité** : Facile d'ajouter de nouveaux types de messages ou de nouveaux consommateurs
- **Robustesse** : Gestion des erreurs à chaque niveau, le système continue de fonctionner même si JMS est indisponible
