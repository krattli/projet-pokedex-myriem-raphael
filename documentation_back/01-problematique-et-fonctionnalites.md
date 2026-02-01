# Problématique et Fonctionnalités 

## 1. Problématique

Dans l'univers Pokémon, les dresseurs (trainers) parcourent le monde pour capturer et collectionner des créatures appelées Pokémon.  
Chaque dresseur maintient un Pokédex, un registre électronique qui recense les Pokémon rencontrés, capturés et leurs caractéristiques.

La gestion manuelle de ces informations devient rapidement complexe lorsque plusieurs dresseurs interagissent avec le système.  
Il devient nécessaire de disposer d'une application centralisée permettant de :

- Gérer les comptes des dresseurs et leur authentification
- Recenser l'ensemble des Pokémon disponibles avec leurs caractéristiques
- Enregistrer les captures effectuées par chaque dresseur
- Suivre les statistiques de chaque dresseur
- Analyser et comparer les Pokémon
- Notifier les événements importants (création de compte, captures) de manière asynchrone

## 2. Le Pokédex

Le Pokédex est un système de gestion de données Pokémon qui permet aux dresseurs de :

- Consulter le catalogue complet des Pokémon avec leurs statistiques (points de vie, attaque, défense, vitesse)
- Identifier les types de chaque Pokémon (Eau, Feu, Plante, etc.)
- Suivre leur collection personnelle de Pokémon capturés
- Comparer les capacités de différents Pokémon

Chaque Pokémon possède un numéro unique dans le Pokédex, un nom, des statistiques et peut appartenir à un ou plusieurs types élémentaires.

## 3. Fonctionnalités

### 3.1 Gestion des Dresseurs (Trainers)

Les dresseurs sont les utilisateurs du système. Chaque dresseur possède :

- Un identifiant unique
- Un nom
- Une adresse email (unique)
- Un mot de passe sécurisé
- Une collection de Pokémon capturés

**Fonctionnalités :**
- Inscription : création d'un nouveau compte dresseur
- Authentification : connexion au système via email et mot de passe
- Consultation du profil : visualisation des informations du dresseur
- Statistiques personnelles : nombre de Pokémon capturés, répartition par type, etc.

### 3.2 Gestion des Pokémon

Le système maintient un catalogue complet de tous les Pokémon disponibles.

**Informations stockées :**
- Numéro du Pokédex (unique)
- Nom du Pokémon
- Statistiques de combat : HP (points de vie), Attaque, Défense, Vitesse
- Types élémentaires (un Pokémon peut avoir plusieurs types)

**Fonctionnalités :**
- Consultation du catalogue : liste de tous les Pokémon
- Recherche par identifiant : accès aux détails d'un Pokémon spécifique
- Comparaison : analyse comparative des statistiques entre plusieurs Pokémon

### 3.3 Gestion des Types

Les types élémentaires définissent les forces et faiblesses des Pokémon dans les combats.

**Fonctionnalités :**
- Consultation des types disponibles
- Association des types aux Pokémon (relation many-to-many)

### 3.4 Gestion des Captures

Une capture représente l'action d'un dresseur qui attrape un Pokémon à un moment donné.

**Informations stockées :**
- Le dresseur qui a effectué la capture
- Le Pokémon capturé
- La date et l'heure de la capture

**Fonctionnalités :**
- Enregistrement d'une capture : un dresseur peut capturer un Pokémon
- Consultation des captures : liste de toutes les captures d'un dresseur
- Historique : suivi de toutes les captures effectuées dans le système
- Recherche : trouver tous les dresseurs qui ont capturé un Pokémon spécifique

### 3.5 Statistiques et Analyses

Le système fournit des outils d'analyse pour les dresseurs :

- Statistiques personnelles : nombre total de captures, Pokémon les plus capturés
- Comparaison de Pokémon : analyse des statistiques (min, max, moyenne) pour plusieurs Pokémon
- Statistiques agrégées : vue d'ensemble des captures de tous les dresseurs

### 3.6 Notifications Asynchrones

Le système envoie des notifications asynchrones pour les événements importants :

- Création de compte : notification lorsqu'un nouveau dresseur s'inscrit
- Capture de Pokémon : notification lorsqu'un dresseur capture un Pokémon

## 4. Cas d'Usage Principaux

### 4.1 Inscription et Connexion

Un nouveau dresseur s'inscrit avec son nom, email et mot de passe. Le système crée son compte et envoie une notification asynchrone. Le dresseur peut ensuite se connecter pour accéder aux fonctionnalités.

### 4.2 Consultation du Catalogue

Un dresseur connecté consulte la liste des Pokémon disponibles, peut rechercher un Pokémon spécifique et consulter ses statistiques détaillées.

### 4.3 Capture d'un Pokémon

Un dresseur capture un Pokémon. Le système enregistre la capture avec la date et l'heure, et envoie une notification asynchrone pour traitement ultérieur (statistiques, journalisation).

### 4.4 Consultation des Statistiques

Un dresseur consulte ses statistiques personnelles : nombre de captures, Pokémon les plus capturés, répartition par type. Le système peut également fournir des statistiques agrégées sur l'ensemble des dresseurs.

### 4.5 Comparaison de Pokémon

Un dresseur souhaite comparer plusieurs Pokémon pour choisir lequel capturer ou utiliser en combat. Le système calcule et affiche les statistiques comparatives (min, max, moyenne) pour chaque caractéristique.
