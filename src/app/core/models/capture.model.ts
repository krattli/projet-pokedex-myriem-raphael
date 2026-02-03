import { Pokemon } from './pokemon.model';
import { Trainer } from './trainer.model';
/**
 * Rappel de la table caught_pokemons, 
 * Elle diffère de l'entité Pokemon par la présence d'un champ captureDate,
 * les pokémons simples les représentent tels qu'ils sont dans le pokédex.
 * IL y en a donc un seul par type de pokémon.
 * Ici, un utilisateur peut capturer plusieurs fois le même pokémon.
*/
export interface CaughtPokemon {
  id: number;
  trainer?: Trainer;
  trainerId?: number;
  pokemon?: Pokemon;
  pokemonId?: number;
  captureDate: string;
}

export interface CaptureRequest {
  trainerId: number;
  pokemonId: number;
}

export interface CaptureMessage {
  trainerId: number;
  trainerName: string;
  pokemonId: number;
  pokemonName: string;
  captureDate: string;
}

// encore inutilisée
export interface AggregatedStats {
  trainerId: number;
  trainerName: string;
  totalCaptures: number;
  capturesByPokemon: { pokemonName: string; count: number }[];
}
