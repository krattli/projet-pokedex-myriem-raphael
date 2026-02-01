import { Type } from './type.model';

export interface Pokemon {
  id: number;
  pokedexNumber: number;
  name: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  types: Type[];
}

export interface PokemonComparison {
  pokemons: Pokemon[];
  stats: {
    minHp: number;
    maxHp: number;
    avgHp: number;
    minAttack: number;
    maxAttack: number;
    avgAttack: number;
    minDefense: number;
    maxDefense: number;
    avgDefense: number;
    minSpeed: number;
    maxSpeed: number;
    avgSpeed: number;
  };
}
