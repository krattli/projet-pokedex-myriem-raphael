export interface Trainer {
  trainerId?: number;
  id?: number;
  name: string;
  email: string;
  password?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface TrainerStats {
  trainerId: number;
  trainerName: string;
  totalCaptures: number;
  uniquePokemons: number;
  totalPokemonsInPokedex: number;
  pokedexCompletionPercentage: number;
  capturesByType: Record<string, number>;
}
