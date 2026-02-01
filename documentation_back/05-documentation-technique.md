# Documentation Technique

Ce document présente les choix techniques et l'implémentation des aspects techniques clés du projet, notamment le système de sécurité et d'authentification, ainsi que la justification des choix d'infrastructure.

## 1. Système de Sécurité et d'Authentification

### 1.1 Architecture du Système d'Authentification

Le système d'authentification est basé sur une approche utilisant :

- **Hachage des mots de passe** avec BCrypt
- **Sessions HTTP** pour maintenir l'état d'authentification
- **Filtre JAX-RS** pour protéger les endpoints
- **Annotation personnalisée** `@Secured` pour marquer les ressources protégées

### 1.2 Inscription (Register)

Lors de l'inscription d'un nouveau dresseur, le processus suit ces étapes :

1. **Vérification de l'unicité de l'email** : Le système vérifie qu'aucun dresseur n'existe déjà avec cet email en utilisant une requête Criteria Builder
2. **Hachage du mot de passe** : Le mot de passe en clair est hashé avec BCrypt avant d'être stocké
3. **Création de l'entité** : Un nouveau Trainer est créé avec le mot de passe hashé
4. **Persistance** : L'entité est persistée dans la base de données via JPA
5. **Envoi d'un message JMS** : Un message TrainerMessage est envoyé pour notifier la création du compte

**Sécurité :**
- Le mot de passe n'est jamais stocké en clair
- BCrypt génère automatiquement un salt unique (valeur aléatoire ajoutée au mot de passe avant le hachage pour renforcer la sécurité) pour chaque mot de passe
- Le mot de passe hashé n'est jamais exposé dans les réponses JSON (grâce à `@JsonbTransient`)

### 1.3 Connexion (Login)

Le processus de connexion :

1. **Recherche du dresseur** : Le système recherche un Trainer par email en utilisant Criteria Builder
2. **Vérification du mot de passe** : Le mot de passe fourni est comparé avec le hash stocké via `BCrypt.checkpw()`
3. **Création de session** : Si les identifiants sont valides, une session HTTP est créée et l'ID du dresseur est stocké dans l'attribut de session `trainerId`
4. **Retour des informations** : Les informations du dresseur (sans le mot de passe) sont retournées

**Sécurité :**
- La session HTTP est gérée par le conteneur (GlassFish) avec expiration automatique après inactivité

### 1.4 Protection des Endpoints

Les endpoints sont protégés via un système de filtrage JAX-RS :

**Annotation `@Secured` :**
- Annotation personnalisée qui peut être appliquée au niveau de la classe ou de la méthode
- Marque les ressources qui nécessitent une authentification

**Filtre `AuthFilter` :**
- Implémente `ContainerRequestFilter` de JAX-RS
- S'exécute avant chaque requête REST
- Vérifie la présence de l'annotation `@Secured` sur la ressource ou la méthode
- Si l'endpoint est protégé, vérifie l'existence d'une session HTTP valide avec l'attribut `trainerId`
- Retourne une erreur 401 UNAUTHORIZED si l'utilisateur n'est pas authentifié


### 1.5 Déconnexion (Logout)

La déconnexion invalide simplement la session HTTP, ce qui supprime l'attribut `trainerId` et empêche les accès ultérieurs aux endpoints protégés.

## 2. Choix Techniques et Justifications

### 2.1 GlassFish comme Serveur d'Application

**Pourquoi GlassFish ?**

**Avantages :**
- **Conformité Jakarta EE** : GlassFish est la référence officielle pour Jakarta EE, garantissant une implémentation complète et conforme des spécifications
- **Support natif** : Support complet de toutes les technologies Jakarta EE utilisées (JAX-RS, EJB, JPA, CDI, JMS)
- **Développement simplifié** : Le plugin Maven `embedded-glassfish-maven-plugin` permet de lancer l'application directement depuis Maven sans configuration complexe
- **Intégration transparente** : Gestion automatique des transactions, injection de dépendances, cycle de vie des beans
- **Environnement de développement** : Parfait pour le développement et les tests, avec démarrage rapide

**Alternative considérée :** 
- **WildFly** : Serveur d'application alternatif, mais nécessite une configuration plus complexe
- **Tomcat + Spring** : Approche différente, mais ne suit pas les spécifications Jakarta EE pures

**Choix final :** GlassFish pour sa simplicité d'utilisation en développement et sa conformité totale avec Jakarta EE.


## 3. Architecture des Sessions HTTP

### 3.1 Gestion des Sessions

Le système utilise les sessions HTTP standard gérées par GlassFish :

- **Création** : Une session est créée lors du login avec `httpRequest.getSession(true)`
- **Stockage** : L'ID du dresseur est stocké dans `session.setAttribute("trainerId", trainerId)`
- **Vérification** : Le filtre vérifie l'existence de la session et de l'attribut `trainerId`
- **Expiration** : Les sessions expirent après 30 minutes d'inactivité (comportement par défaut de GlassFish)
- **Invalidation** : La session est invalidée lors du logout

### 3.2 Avantages de cette Approche

- **Simplicité** : Pas besoin de tokens JWT ou de cookies personnalisés
- **Sécurité** : Les sessions sont gérées par le conteneur avec protection contre les attaques CSRF
- **Stateless côté client** : Le client n'a qu'à gérer le cookie JSESSIONID
- **Intégration native** : Fonctionne nativement avec tous les composants Jakarta EE


## 4. Sérialisation JSON

### 4.1 JSON-B pour la Sérialisation

Le projet utilise JSON-B (Jakarta JSON Binding) pour la sérialisation/désérialisation JSON :

- **Standard Jakarta EE** : JSON-B est le standard pour la sérialisation JSON
- **Automatique** : Sérialisation automatique des objets Java en JSON
- **Annotations** : Support des annotations pour contrôler la sérialisation (`@JsonbTransient`)

### 4.2 Protection des Données Sensibles

Les données sensibles sont protégées via `@JsonbTransient` :

- **Mot de passe** : Le champ `password` de `Trainer` est marqué `@JsonbTransient` pour ne jamais être exposé dans les réponses JSON
- **Relations circulaires** : Les collections bidirectionnelles (`captures` dans `Trainer` et `Pokemon`) sont marquées `@JsonbTransient` pour éviter les références circulaires lors de la sérialisation

