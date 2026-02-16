/**
 * Centralized state for the playing/hub phase. Single source of truth for portal,
 * board, chest, cooldowns, crossbow, inventory, etc.
 */
export interface PortalState {
  x: number;
  y: number;
  width: number;
  height: number;
  spawned: boolean;
  hasNextLevel: boolean;
  targetLevel: number;
}

export interface BoardState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ChestState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ShopState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlayingStateShape {
  portal: PortalState | null;
  portalUseCooldown: number;
  playerNearPortal: boolean;
  board: BoardState | null;
  boardOpen: boolean;
  boardUseCooldown: number;
  playerNearBoard: boolean;
  chest: ChestState | null;
  chestOpen: boolean;
  chestUseCooldown: number;
  playerNearChest: boolean;
  shop: ShopState | null;
  shopOpen: boolean;
  shopUseCooldown: number;
  shopScrollOffset: number;
  /** Which weapon-type dropdowns are expanded. Key = base weapon key; undefined/true = expanded, false = collapsed. */
  shopExpandedWeapons?: Record<string, boolean>;
  playerNearShop: boolean;
  crossbowReloadProgress: number;
  crossbowReloadInProgress: boolean;
  crossbowPerfectReloadNext: boolean;
  playerProjectileCooldown: number;
  inventoryOpen: boolean;
  killsThisLife: number;
  gold: number;
  lastHitEnemyId: string | null;
  playerInGatherableRange: boolean;
  equippedMainhandKey: string;
  equippedOffhandKey: string;
  /** Current durability for equipped mainhand (0..MAX_WEAPON_DURABILITY). One hit = -1. */
  equippedMainhandDurability: number;
  /** Current durability for equipped offhand (0..MAX_WEAPON_DURABILITY). */
  equippedOffhandDurability: number;
  /** 24 slots: weapon key or null. Starts empty; filled only by taking from chest. */
  inventorySlots: (string | null)[];
  /** Weapon instances in the chest (weapon keys). Only source of weapon instances. */
  chestSlots: string[];
  hubSelectedLevel: number;
  screenBeforePause: 'playing' | 'hub' | null;
}

/** Initial chest contents: one of each base weapon at Rusty tier (shield has no tier). */
export const INITIAL_CHEST_WEAPONS: string[] = [
  'sword_rusty', 'shield', 'dagger_rusty', 'greatsword_rusty', 'crossbow_rusty', 'mace_rusty'
];

/** Max durability per weapon. Each confirmed hit costs 1. */
export const MAX_WEAPON_DURABILITY = 100;

/** Resolves config defaultWeapon (+ optional defaultOffhand) to mainhand and offhand. */
export function resolveDefaultWeapons(defaultWeapon: string, defaultOffhand?: string): { mainhand: string; offhand: string } {
  return { mainhand: defaultWeapon, offhand: defaultOffhand ?? 'none' };
}

const defaultPlayingState = (defaultMainhand: string, defaultOffhand: string, chestSlots: string[]): PlayingStateShape => ({
  portal: null,
  portalUseCooldown: 0,
  playerNearPortal: false,
  board: null,
  boardOpen: false,
  boardUseCooldown: 0,
  playerNearBoard: false,
  chest: null,
  chestOpen: false,
  chestUseCooldown: 0,
  playerNearChest: false,
  shop: null,
  shopOpen: false,
  shopUseCooldown: 0,
  shopScrollOffset: 0,
  playerNearShop: false,
  crossbowReloadProgress: 1,
  crossbowReloadInProgress: false,
  crossbowPerfectReloadNext: false,
  playerProjectileCooldown: 0,
  inventoryOpen: false,
  killsThisLife: 0,
  gold: 10000,
  lastHitEnemyId: null,
  playerInGatherableRange: false,
  equippedMainhandKey: defaultMainhand,
  equippedOffhandKey: defaultOffhand,
  equippedMainhandDurability: MAX_WEAPON_DURABILITY,
  equippedOffhandDurability: MAX_WEAPON_DURABILITY,
  inventorySlots: Array(24).fill(null) as (string | null)[],
  chestSlots: [...chestSlots],
  hubSelectedLevel: 1,
  screenBeforePause: null
});

export class PlayingState implements PlayingStateShape {
  portal: PortalState | null = null;
  portalUseCooldown = 0;
  playerNearPortal = false;
  board: BoardState | null = null;
  boardOpen = false;
  boardUseCooldown = 0;
  playerNearBoard = false;
  chest: ChestState | null = null;
  chestOpen = false;
  chestUseCooldown = 0;
  playerNearChest = false;
  shop: ShopState | null = null;
  shopOpen = false;
  shopUseCooldown = 0;
  shopScrollOffset = 0;
  playerNearShop = false;
  crossbowReloadProgress = 1;
  crossbowReloadInProgress = false;
  crossbowPerfectReloadNext = false;
  playerProjectileCooldown = 0;
  inventoryOpen = false;
  killsThisLife = 0;
  gold = 10000;
  lastHitEnemyId: string | null = null;
  playerInGatherableRange = false;
  equippedMainhandKey: string;
  equippedOffhandKey: string;
  equippedMainhandDurability = MAX_WEAPON_DURABILITY;
  equippedOffhandDurability = MAX_WEAPON_DURABILITY;
  inventorySlots: (string | null)[] = Array(24).fill(null) as (string | null)[];
  chestSlots: string[] = [...INITIAL_CHEST_WEAPONS];
  hubSelectedLevel = 1;
  screenBeforePause: 'playing' | 'hub' | null = null;

  constructor(defaultMainhand: string, defaultOffhand: string = 'none') {
    this.equippedMainhandKey = defaultMainhand;
    this.equippedOffhandKey = defaultOffhand;
  }

  reset(_defaultWeapon?: string): void {
    Object.assign(this, defaultPlayingState('none', 'none', INITIAL_CHEST_WEAPONS));
    this.chestSlots = [...INITIAL_CHEST_WEAPONS];
  }
}
