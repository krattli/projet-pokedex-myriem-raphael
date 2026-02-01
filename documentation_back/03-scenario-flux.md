# Scénario d'Utilisation Complet

Ce document illustre un scénario d'utilisation complet montrant le flux complet depuis une requête REST jusqu'au traitement par le consommateur JMS, en passant par les couches EJB, JPA et JMS.

## Scénario : Capture d'un Pokémon par un Dresseur

Ce scénario détaille le processus complet lorsqu'un dresseur capture un Pokémon, depuis l'appel REST jusqu'au traitement asynchrone par le consommateur JMS.

### Contexte Initial

- Un dresseur (trainer) est déjà authentifié dans le système
- Le dresseur a un ID : 21
- Un Pokémon avec l'ID 8 existe dans la base de données
- Le dresseur souhaite capturer ce Pokémon

### Étape par Étape

#### Étape 1 : Requête REST (Client → Couche REST)

Le client envoie une requête HTTP POST pour enregistrer la capture avec les données du dresseur (ID 21) et du Pokémon (ID 8).

**Composant impliqué :** `CaughtPokemonResource` (JAX-RS Resource)

**Résultat :** La requête est reçue et validée par la couche REST.

---

#### Étape 2 : Logique Métier (Couche REST → Couche EJB)

La couche REST délègue le traitement à la couche service (EJB). Le service récupère les entités Trainer et Pokemon depuis la base de données, valide leur existence, puis crée l'entité CaughtPokemon.

**Composant impliqué :** `CaughtPokemonService` (EJB Stateless)

**Résultat :** La logique métier valide les données et prépare la création de l'entité.

---

#### Étape 3 : Persistance (Couche EJB → Couche JPA)

L'entité est persistée dans la base de données via JPA. L'EntityManager génère un INSERT SQL, la transaction est gérée automatiquement par le conteneur EJB, et l'entité CaughtPokemon est sauvegardée dans la table `caught_pokemons`.

**Résultat :** La capture est enregistrée dans la base de données PostgreSQL.

---

#### Étape 4 : Envoi du Message JMS (Couche EJB → Couche JMS)

Après la persistance, un message JMS est envoyé de manière asynchrone. Un CaptureMessage est créé contenant les informations du dresseur (ID 21, nom "Ash Ketchum") et du Pokémon (ID 8, nom "Wartortle").

**Composant impliqué :** `CaptureMessageProducer` (EJB Stateless)

**Action JMS :**
- Connexion à ActiveMQ Artemis (broker JMS)
- Création d'un ObjectMessage contenant le CaptureMessage
- Envoi du message dans la queue "captures"
- Le message est sérialisé (le CaptureMessage implémente Serializable)

**Résultat :** Le message est placé dans la queue JMS "captures" sur ActiveMQ Artemis.

**Remarque :** L'envoi du message JMS est asynchrone et non bloquant. Même si le consommateur JMS est indisponible, la requête REST retourne une réponse 201 CREATED immédiatement.

---

#### Étape 5 : Réception par le Consommateur JMS (JMS → Consommateur)

Le module consumer JMS (`pokedex-jms-consumer`) écoute en permanence la queue "captures".

**Composant impliqué :** `JmsMessageListener` (EJB Singleton @Startup)

**Action :**
- Le JmsMessageListener est démarré automatiquement au démarrage de l'application (grâce à @Startup)
- Il écoute en permanence la queue "captures"
- Dès qu'un message arrive, la méthode `handleCaptureMessage()` est appelée automatiquement

**Résultat :** Le message est reçu par le consommateur.

---

#### Étape 6 : Traitement du Message (Content-based Router + Message Filter)

Le consommateur traite le message selon son type. Le message est filtré pour vérifier qu'il s'agit bien d'un ObjectMessage contenant un CaptureMessage, puis il est loggé avec les informations du dresseur et du Pokémon.

**Patterns appliqués :**
- **Content-based Router** : Le message est routé vers `handleCaptureMessage()` car il provient de la queue "captures"
- **Message Filter** : Filtrage par type de message JMS (ObjectMessage) et par type d'objet (CaptureMessage)

**Résultat :** Le message est validé, loggé et stocké.

---

#### Étape 7 : Stockage en Mémoire

Le message est stocké dans le service de log en mémoire. Le MessageLogService maintient une liste thread-safe des messages de capture, limitée à 100 messages (FIFO).

**Composant impliqué :** `MessageLogService` (Singleton)

**Résultat :** Le message est stocké en mémoire dans une liste thread-safe, limitée à 100 messages.


