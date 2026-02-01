import { Pokemon } from './pokemon.model';
import { Trainer } from './trainer.model';

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

export interface AggregatedStats {
  trainerId: number;
  trainerName: string;
  totalCaptures: number;
  capturesByPokemon: { pokemonName: string; count: number }[];
}
