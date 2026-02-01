# Pokedex Backend - Jakarta EE

REST API for managing a Pokedex.

## Quick Start

### Prerequisites
- Java 21
- Docker

## Architecture
- **JAX-RS** : REST API (Jersey)
- **JPA/Hibernate** : Data persistence
- **EJB** : Business services (@Stateless)
- **CDI** : Dependency injection
- **GlassFish** : Jakarta EE application server
- **PostgreSQL** : Database
- **ActiveMQ Artemis** : Message broker (JMS)

## Documentation

For full documentation, refer to [documentation](./documentation/).
- 


### 1. Start services (PostgreSQL + Artemis)
```bash
docker compose up -d
```

### 2. Run the main application
```bash
mvn clean package
mvn embedded-glassfish:run
```

API is available at: `http://localhost:8080/api`

### 3. Run the JMS Consumer
In a separate terminal, launch the JMS consumer module:

```bash
cd pokedex-jms-consumer
mvn clean package -DskipTests
mvn embedded-glassfish:run
```

Consumer API is available at: `http://localhost:8081/api`

The consumer listens to JMS queues and processes capture and trainer creation messages. See `pokedex-jms-consumer/README.md` for more details.

### 4. Populate database (optional)
```bash
./populate-db.sh http://localhost:8080/api
```

## Features

### Authentication
- **POST** `/api/auth/register` - Register (name, email, password)
- **POST** `/api/auth/login` - Login (email, password)
- **POST** `/api/auth/logout` - Logout
- Password hashing with BCrypt
- HTTP sessions with JSESSIONID cookies (expire after 30 minutes of inactivity (default GlassFish behavior))
- Endpoint protection with `@Secured`

### Trainers
- **POST** `/api/trainers` - Create a trainer
- **GET** `/api/trainers` - List all trainers
- **GET** `/api/trainers/{id}` - Get trainer details
- **PUT** `/api/trainers/{id}` - Update a trainer
- **DELETE** `/api/trainers/{id}` - Delete a trainer
- **GET** `/api/trainers/{id}/stats` - Get trainer statistics

### Pokémons
- **POST** `/api/pokemons` - Create a pokemon
- **GET** `/api/pokemons` - List all pokemons
- **GET** `/api/pokemons/{id}` - Get pokemon details
- **PUT** `/api/pokemons/{id}` - Update a pokemon
- **DELETE** `/api/pokemons/{id}` - Delete a pokemon
- **POST** `/api/pokemons/compare` - Compare multiple pokémons (stats)

### Types
- **POST** `/api/types` - Create a type
- **GET** `/api/types` - List all types
- **GET** `/api/types/{id}` - Get type details
- **PUT** `/api/types/{id}` - Update a type
- **DELETE** `/api/types/{id}` - Delete a type

### Captures (CaughtPokemons)
- **POST** `/api/caught-pokemons` - Record a capture (trainerId, pokemonId)
- **GET** `/api/caught-pokemons` - List all captures
- **GET** `/api/caught-pokemons/{id}` - Get capture details
- **GET** `/api/caught-pokemons/trainer/{trainerId}` - Get trainer's captures
- **GET** `/api/caught-pokemons/pokemon/{pokemonId}` - Get trainers who caught a pokemon
- **DELETE** `/api/caught-pokemons/{id}` - Delete a capture

### JMS Consumer API (port 8081)
The JMS consumer module provides additional endpoints for viewing processed messages:
- **GET** `/api/captures` - List all capture messages
- **GET** `/api/captures/recent?limit=N` - Get recent capture messages (default: 10, max: 100)
- **GET** `/api/captures/stats` - Get capture statistics
- **GET** `/api/creations` - List all trainer creation messages
- **GET** `/api/creations/recent?limit=N` - Get recent trainer creation messages (default: 10, max: 100)
- **GET** `/api/creations/stats` - Get trainer creation statistics
- **GET** `/api/aggregated/stats` - Get aggregated statistics for all trainers
- **GET** `/api/aggregated/stats/trainer/{trainerId}` - Get aggregated statistics for a specific trainer
- **GET** `/api/health` - Health check endpoint

**Usage example:**
```bash
# 1. Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ash Ketchum","email":"ash@pokemon.com","password":"pikachu123"}' \
  -c cookies.txt

# 2. Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ash@pokemon.com","password":"pikachu123"}' \
  -c cookies.txt

# 3. Use the API (with session cookie)
curl http://localhost:8080/api/pokemons -b cookies.txt
```
## Project Structure

```
src/main/java/com/example/
├── config/          # Configuration (ApplicationConfig)
├── domain/          # JPA entities (Trainer, Pokemon, Type, CaughtPokemon)
├── dto/             # Data Transfer Objects
├── rest/            # REST resources (endpoints)
├── security/        # Authentication (@Secured, AuthFilter)
└── service/         # Business services EJB

src/test/java/       # Unit tests
```
