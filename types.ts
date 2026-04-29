export enum GameState {
  MENU = 'MENU', // New state for difficulty selection
  START = 'START',
  PLAYING = 'PLAYING',
  LEVEL_UP = 'LEVEL_UP',
  GAME_OVER = 'GAME_OVER',
  RESUMING = 'RESUMING'
}

export interface PhysicsConfig {
  gravity: number;
  jumpStrength: number;
  pipeSpeed: number;
  gapSize: number;
  spawnRate: number; // Distance between pipes
}

export type DifficultyId = 'normal';

export interface DifficultyConfig {
  id: DifficultyId;
  name: string;
  description: string;
  color: string;
  physics: PhysicsConfig;
  bossHpMultiplier: number;
  scoreMultiplier: number;
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'mythic' | 'legendary' | 'mystic';

export interface Perk {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  icon: string;
  // Some perks modify physics, others are handled by ID logic (like HP)
  apply?: (config: PhysicsConfig) => PhysicsConfig; 
}

// Logical representation of a pipe for the physics engine
export interface PipeEntity {
  id: number;
  x: number;
  topHeight: number;
  passed: boolean;
  poolIndex: number; // Which DOM element represents this pipe
  
  // Roguelike elements
  hasOrb: boolean;
  orbY: number;
  orbCollected: boolean;
}

export interface BirdState {
  y: number;
  velocity: number;
  rotation: number;
  scale: number;
  
  // Roguelike stats
  hp: number;
  maxHp: number;
  isInvulnerable: boolean;
  invulnTimer: number;
  
  // Advanced Perk Stats
  revives: number; // For Phoenix/Time Rewind
  shieldCharges: number; // For Divine Shield
}

// --- BOSS MECHANICS ---
export interface BossState {
  active: boolean;      // Is the boss currently fighting?
  incoming: boolean;    // Is the boss about to appear (clearing pipes)?
  isDying: boolean;     // Is the boss in the middle of the death animation?
  deathTimer: number;   // Timer for the death animation
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attackTimer: number;  // Time until next shot
  orbTimer: number;     // Time until next red orb spawns
  phase: number;        // For attack patterns
  flashTimer: number;   // Visual hit feedback
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'fireball' | 'wave';
}

export interface DamageOrb {
  id: number;
  x: number;
  y: number;
  collected: boolean;
}