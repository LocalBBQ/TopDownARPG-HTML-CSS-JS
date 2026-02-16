/**
 * Quest and difficulty types for the quest board and run scaling.
 */

export interface DifficultyDef {
  id: string;
  label: string;
  goldMultiplier: number;
  packDensityMultiplier: number;
  packSizeBonus: number;
  enemyTier2Chance: number;
}

export interface Quest {
  level: number;
  difficultyId: string;
  difficulty?: DifficultyDef;
  seed?: number;
}
