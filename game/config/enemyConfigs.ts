// All enemy configs and type exports. Single module replacing Goblin, Skeleton, etc. files.
import { EnemyType } from '../enemies/EnemyType.ts';
import { EnemyWeapons } from '../weapons/EnemyWeaponsRegistry.ts';
import { Weapons } from '../weapons/WeaponsRegistry.ts';

type ChieftainClubWeaponType = {
  heavySmash?: {
    chargeTime?: number;
    releaseDuration?: number;
    damage?: number;
    knockbackForce?: number;
    aoeInFront?: boolean;
    aoeOffset?: number;
    aoeRadius?: number;
    range?: number;
  };
};

// Goblin: stats derived from goblinDagger weapon. Uses weapon dash attack (leap), not config lunge.
const goblinWeapon = EnemyWeapons.getGoblinWeapon?.() ?? EnemyWeapons.resolveWeapon?.('goblinDagger') ?? null;
let goblinAttackRange = 40, goblinAttackDamage = 5, goblinAttackCooldown = 1.2;
if (goblinWeapon) {
  const first = (goblinWeapon as { getComboStageProperties?(n: number): { range: number; damage: number } }).getComboStageProperties?.(1);
  if (first) {
    goblinAttackRange = first.range;
    goblinAttackDamage = first.damage;
  }
  if ((goblinWeapon as { cooldown?: number }).cooldown != null) goblinAttackCooldown = (goblinWeapon as { cooldown: number }).cooldown;
}

const goblinConfig = {
  maxHealth: 30,
  moveSpeed: 25,
  weaponId: 'goblinDagger',
  attackRange: goblinAttackRange,
  attackDamage: goblinAttackDamage,
  detectionRange: 200,
  color: '#44aa44',
  attackCooldown: goblinAttackCooldown,
  windUpTime: 0,
  attackCooldownMultiplier: 1,
  damageMultiplier: 1,
  stunThreshold: 60,
  stunBuildupPerHit: 18,
  knockbackResist: 0,
  knockback: { force: 160, decay: 0.88 },
  maxStamina: 30,
  staminaRegen: 4,
  attackStaminaCost: 12,
  goldDrop: 2,
  weaponDropChance: 0.04,
  weaponDropPoolId: 'goblin',
  whetstoneDropChance: 0.06
};

// Skeleton: ranged projectile, no melee
const skeletonConfig = {
  maxHealth: 50,
  moveSpeed: 20,
  attackRange: 50,
  attackDamage: 8,
  color: '#cccccc',
  attackCooldown: 1.5,
  windUpTime: 0.7,
  stunBuildupPerHit: 15,
  knockbackResist: 0,
  knockback: { force: 190, decay: 0.87 },
  projectile: {
    enabled: true,
    speed: 120,
    damage: 6,
    range: 280,
    cooldown: 3.5,
    stunBuildup: 15
  },
  goldDrop: 3,
  weaponDropChance: 0.05,
  weaponDropPoolId: 'skeleton',
  whetstoneDropChance: 0.07
};

// Lesser demon: claw + lunge
const lesserDemonConfig = {
  maxHealth: 45,
  moveSpeed: 32,
  attackRange: 45,
  attackDamage: 7,
  detectionRange: 220,
  color: '#884444',
  attackCooldown: 0.85,
  windUpTime: 0.5,
  stunBuildupPerHit: 18,
  knockbackResist: 0.1,
  knockback: { force: 180, decay: 0.87 },
  lunge: {
    enabled: true,
    chargeRange: 160,
    chargeTime: 0.7,
    lungeSpeed: 220,
    lungeDistance: 130,
    lungeDamage: 10,
    knockback: { force: 260 }
  },
  goldDrop: 4,
  weaponDropChance: 0.06,
  weaponDropPoolId: 'lesserDemon',
  whetstoneDropChance: 0.08
};

// Greater demon: pillar flame
const greaterDemonConfig = {
  maxHealth: 80,
  moveSpeed: 30,
  attackRange: 60,
  attackDamage: 12,
  detectionRange: 300,
  color: '#aa4444',
  attackCooldown: 0.67,
  windUpTime: 0.5,
  stunBuildupPerHit: 22,
  knockbackResist: 0.2,
  knockback: { force: 230, decay: 0.86 },
  pillarFlame: {
    castDelay: 2.0,
    activeDuration: 2.0,
    radius: 45,
    damage: 8,
    damageInterval: 0.4,
    cooldown: 18.0,
    pillarRange: 220
  },
  goldDrop: 8,
  weaponDropChance: 0.12,
  weaponDropPoolId: 'greaterDemon',
  whetstoneDropChance: 0.10
};

// Goblin chieftain: stats from ChieftainClub heavySmash
const chieftainWeapon = EnemyWeapons.chieftainClub as ChieftainClubWeaponType | undefined;
const heavySmash = chieftainWeapon?.heavySmash ?? {
  chargeTime: 1.15,
  releaseDuration: 0.22,
  damage: 16,
  knockbackForce: 280,
  aoeInFront: true,
  aoeOffset: 55,
  aoeRadius: 42
};
const chieftainAttackRange = heavySmash.aoeInFront
  ? (heavySmash.aoeOffset ?? 55) + (heavySmash.aoeRadius ?? 42)
  : (heavySmash as { range?: number }).range ?? 97;

const goblinChieftainConfig = {
  maxHealth: 60,
  moveSpeed: 50,
  weaponDropChance: 0.1,
  weaponDropPoolId: 'goblinChieftain',
  weaponId: 'chieftainClub',
  attackRange: chieftainAttackRange,
  attackDamage: heavySmash.damage,
  detectionRange: 220,
  color: '#2d5a2d',
  attackCooldown: 1.2,
  windUpTime: 0.5,
  stunThreshold: 70,
  stunBuildupPerHit: 24,
  knockbackResist: 0.5,
  knockback: { force: 200, decay: 0.86 },
  heavySmash,
  warCry: {
    enabled: true,
    radius: 180,
    cooldown: 12.0,
    buffDuration: 5.0,
    speedMultiplier: 1.2,
    damageMultiplier: 1.2
  },
  goldDrop: 5,
  whetstoneDropChance: 0.08
};

// Bandit: mace — stats from Weapons.mace
const banditWeapon = Weapons.mace as { getComboStageProperties?(n: number): { range: number; damage: number }; cooldown?: number } | undefined;
let banditAttackRange = 95, banditAttackDamage = 22, banditAttackCooldown = 0.35;
if (banditWeapon) {
  const first = banditWeapon.getComboStageProperties?.(1);
  if (first) {
    banditAttackRange = first.range;
    banditAttackDamage = first.damage;
  }
  if (banditWeapon.cooldown != null) banditAttackCooldown = banditWeapon.cooldown;
}

const banditConfig = {
  maxHealth: 55,
  moveSpeed: 82,
  weaponId: 'mace',
  attackRange: banditAttackRange,
  attackDamage: banditAttackDamage,
  detectionRange: 220,
  color: '#5c4a3a',
  attackCooldown: banditAttackCooldown,
  windUpTime: 0,
  attackCooldownMultiplier: 2.5,
  attackDurationMultiplier: 2.5,
  damageMultiplier: 1,
  stunThreshold: 90,
  stunBuildupPerHit: 35,
  knockbackResist: 0,
  knockback: { force: 180, decay: 0.88 },
  lunge: { enabled: false },
  maxStamina: 50,
  staminaRegen: 3,
  attackStaminaCost: 25,
  goldDrop: 5,
  weaponDropChance: 0.06,
  weaponDropPoolId: 'bandit',
  whetstoneDropChance: 0.07
};

// Bandit dagger: stats from Weapons.dagger
const banditDaggerWeapon = Weapons.dagger as {
  getComboStageProperties?(n: number): { range: number; damage: number };
  getDashAttackProperties?(): { damage?: number; knockbackForce?: number };
  cooldown?: number;
} | undefined;
let banditDaggerAttackRange = 40, banditDaggerAttackDamage = 5, banditDaggerAttackCooldown = 0.25, banditDaggerLungeDamage = 8, banditDaggerLungeKnockbackForce = 240;
if (banditDaggerWeapon) {
  const first = banditDaggerWeapon.getComboStageProperties?.(1);
  const dash = banditDaggerWeapon.getDashAttackProperties?.();
  if (first) {
    banditDaggerAttackRange = first.range;
    banditDaggerAttackDamage = first.damage;
  }
  if (banditDaggerWeapon.cooldown != null) banditDaggerAttackCooldown = banditDaggerWeapon.cooldown;
  if (dash) {
    banditDaggerLungeDamage = dash.damage ?? banditDaggerLungeDamage;
    if (dash.knockbackForce != null) banditDaggerLungeKnockbackForce = dash.knockbackForce;
  }
}

const banditDaggerConfig = {
  maxHealth: 42,
  moveSpeed: 88,
  weaponId: 'dagger',
  attackRange: banditDaggerAttackRange,
  attackDamage: banditDaggerAttackDamage,
  detectionRange: 220,
  color: '#5c4a3a',
  attackCooldown: banditDaggerAttackCooldown,
  windUpTime: 2.0,
  attackCooldownMultiplier: 2.5,
  damageMultiplier: 1,
  stunThreshold: 75,
  stunBuildupPerHit: 20,
  knockbackResist: 0,
  knockback: { force: 150, decay: 0.88 },
  lunge: {
    enabled: true,
    chargeRange: 155,
    chargeTime: 1.0,
    lungeSpeed: 250,
    lungeDistance: 120,
    lungeDamage: banditDaggerLungeDamage,
    hitRadiusBonus: 0,
    knockback: { force: banditDaggerLungeKnockbackForce },
    hopBackChance: 0.4,
    hopBackDelay: 0.6,
    hopBackDistance: 48,
    hopBackSpeed: 150
  },
  packModifier: 'swift',
  maxStamina: 45,
  staminaRegen: 3,
  attackStaminaCost: 10,
  goldDrop: 3,
  whetstoneDropChance: 0.06
};

// Tier-2: Goblin Brute — stronger goblin variant for harder quests
const goblinBruteConfig = {
  ...goblinConfig,
  maxHealth: 45,
  attackDamage: Math.ceil(goblinAttackDamage * 1.3),
  moveSpeed: 22,
  color: '#2d6a2d',
  stunThreshold: 75,
  stunBuildupPerHit: 22,
  knockbackResist: 0.15,
  goldDrop: 5
};

// Tier-2: Skeleton Veteran — stronger skeleton variant for harder quests
const skeletonVeteranConfig = {
  ...skeletonConfig,
  maxHealth: 75,
  attackDamage: 10,
  moveSpeed: 22,
  color: '#a0a0a0',
  attackCooldown: 1.35,
  projectile: {
    enabled: true,
    speed: 200,
    damage: 8,
    range: 280,
    cooldown: 3.2,
    stunBuildup: 18
  },
  stunBuildupPerHit: 18,
  knockbackResist: 0.1,
  goldDrop: 6
};

// Tier-2: Bandit Veteran
const banditVeteranConfig = {
  ...banditConfig,
  maxHealth: 78,
  attackDamage: Math.ceil(banditAttackDamage * 1.2),
  moveSpeed: 86,
  color: '#4a3a2d',
  stunThreshold: 105,
  stunBuildupPerHit: 40,
  knockbackResist: 0.12,
  goldDrop: 8,
  weaponDropChance: 0.08,
  whetstoneDropChance: 0.09
};

// Tier-2: Bandit Dagger Veteran
const banditDaggerVeteranConfig = {
  ...banditDaggerConfig,
  maxHealth: 58,
  attackDamage: Math.ceil(banditDaggerAttackDamage * 1.25),
  moveSpeed: 92,
  stunThreshold: 88,
  stunBuildupPerHit: 24,
  goldDrop: 5,
  weaponDropChance: 0.07,
  whetstoneDropChance: 0.08
};

// Tier-2: Lesser Demon Veteran
const lesserDemonVeteranConfig = {
  ...lesserDemonConfig,
  maxHealth: 62,
  attackDamage: 9,
  moveSpeed: 35,
  color: '#994444',
  stunBuildupPerHit: 22,
  knockbackResist: 0.22,
  lunge: {
    ...lesserDemonConfig.lunge,
    lungeDamage: 13,
    knockback: { force: 300 }
  },
  goldDrop: 6,
  weaponDropChance: 0.08,
  whetstoneDropChance: 0.10
};

// Tier-2: Greater Demon Veteran
const greaterDemonVeteranConfig = {
  ...greaterDemonConfig,
  maxHealth: 105,
  attackDamage: 15,
  moveSpeed: 33,
  color: '#bb5555',
  stunBuildupPerHit: 26,
  knockbackResist: 0.32,
  pillarFlame: {
    ...greaterDemonConfig.pillarFlame,
    damage: 10,
    cooldown: 16.0
  },
  goldDrop: 12,
  weaponDropChance: 0.14,
  whetstoneDropChance: 0.12
};

// Tier-2: Goblin Chieftain Veteran
const goblinChieftainVeteranConfig = {
  ...goblinChieftainConfig,
  maxHealth: 85,
  moveSpeed: 54,
  attackDamage: Math.ceil((heavySmash.damage ?? 16) * 1.2),
  stunThreshold: 85,
  stunBuildupPerHit: 28,
  knockbackResist: 0.6,
  heavySmash: {
    ...heavySmash,
    damage: Math.ceil((heavySmash.damage ?? 16) * 1.2),
    knockbackForce: 320
  },
  goldDrop: 8,
  weaponDropChance: 0.12,
  whetstoneDropChance: 0.10
};

// Zombie: slow melee, no lunge — spawns in Cursed Wilds and Demon Approach
const zombieWeapon = EnemyWeapons.resolveWeapon?.('zombieClaw') ?? null;
let zombieAttackRange = 58, zombieAttackDamage = 6, zombieAttackCooldown = 1.0;
if (zombieWeapon) {
  const first = (zombieWeapon as { getComboStageProperties?(n: number): { range: number; damage: number } }).getComboStageProperties?.(1);
  if (first) {
    zombieAttackRange = first.range;
    zombieAttackDamage = first.damage;
  }
  if ((zombieWeapon as { cooldown?: number }).cooldown != null) zombieAttackCooldown = (zombieWeapon as { cooldown: number }).cooldown;
}

const zombieConfig = {
  maxHealth: 55,
  moveSpeed: 72,
  weaponId: 'zombieClaw',
  attackRange: zombieAttackRange,
  attackDamage: zombieAttackDamage,
  detectionRange: 800,
  color: '#3d5c3d',
  attackCooldown: zombieAttackCooldown,
  windUpTime: 0.4,
  attackCooldownMultiplier: 1,
  damageMultiplier: 1,
  stunThreshold: 70,
  stunBuildupPerHit: 16,
  knockbackResist: 0.2,
  knockback: { force: 140, decay: 0.88 },
  goldDrop: 3,
  weaponDropChance: 0.04,
  weaponDropPoolId: 'zombie',
  whetstoneDropChance: 0.06
};

// Tier-2: Zombie Veteran
const zombieVeteranConfig = {
  ...zombieConfig,
  maxHealth: 82,
  attackDamage: Math.ceil(zombieAttackDamage * 1.35),
  moveSpeed: 78,
  color: '#2d4a2d',
  stunThreshold: 85,
  stunBuildupPerHit: 20,
  knockbackResist: 0.35,
  goldDrop: 6,
  weaponDropChance: 0.06,
  whetstoneDropChance: 0.08
};

// Training dummy: immobile, never attacks, high health, no gold, resets health on "death" (handled in EnemyManager)
const trainingDummyConfig = {
  maxHealth: 500,
  moveSpeed: 0,
  attackRange: 0,
  attackDamage: 0,
  detectionRange: 0,
  color: '#6b5344',
  attackCooldown: 999,
  windUpTime: 0,
  stunBuildupPerHit: 0,
  knockbackResist: 1,
  knockback: { force: 0, decay: 1 },
  goldDrop: 0
};

// Boss: fire dragon — large fire projectile, lunge to close gaps, claw melee
const dragonClawWeapon = EnemyWeapons.resolveWeapon?.('dragonClaw') ?? null;
let fireDragonAttackRange = 58, fireDragonAttackDamage = 14, fireDragonAttackCooldown = 1.1;
if (dragonClawWeapon) {
  const first = (dragonClawWeapon as { getComboStageProperties?(n: number): { range: number; damage: number } }).getComboStageProperties?.(1);
  if (first) {
    fireDragonAttackRange = first.range;
    fireDragonAttackDamage = first.damage;
  }
  if ((dragonClawWeapon as { cooldown?: number }).cooldown != null) fireDragonAttackCooldown = (dragonClawWeapon as { cooldown: number }).cooldown;
}

const fireDragonConfig = {
  maxHealth: 440,
  moveSpeed: 32,
  weaponId: 'dragonClaw',
  attackRange: fireDragonAttackRange,
  attackDamage: fireDragonAttackDamage,
  detectionRange: 460,
  color: '#c44c22',
  attackCooldown: fireDragonAttackCooldown,
  windUpTime: 0.4,
  stunThreshold: 160,
  stunBuildupPerHit: 14,
  knockbackResist: 0.52,
  knockback: { force: 220, decay: 0.85 },
  lunge: {
    enabled: true,
    chargeRange: 320,
    chargeTime: 0.72,
    lungeSpeed: 300,
    lungeDistance: 220,
    lungeDamage: 26,
    knockback: { force: 380 }
  },
  projectile: {
    enabled: true,
    speed: 220,
    damage: 30,
    range: 520,
    cooldown: 3.6,
    stunBuildup: 32,
    width: 32,
    height: 32,
    color: '#ff6600'
  },
  goldDrop: 32,
  weaponDropChance: 0.18,
  weaponDropPoolId: 'fireDragon',
  whetstoneDropChance: 0.12
};

// Tier-2: Fire Dragon Alpha (2★ boss)
const fireDragonAlphaConfig = {
  ...fireDragonConfig,
  maxHealth: 550,
  moveSpeed: 36,
  attackDamage: Math.ceil(fireDragonAttackDamage * 1.2),
  stunThreshold: 185,
  stunBuildupPerHit: 18,
  knockbackResist: 0.58,
  lunge: {
    ...fireDragonConfig.lunge,
    lungeDamage: 32,
    knockback: { force: 420 }
  },
  projectile: {
    ...fireDragonConfig.projectile,
    damage: 36,
    cooldown: 3.2
  },
  goldDrop: 42,
  weaponDropChance: 0.22,
  whetstoneDropChance: 0.14
};

// Tier-3 (★★★) Elite variants — Very Hard only
const goblinEliteConfig = {
  ...goblinBruteConfig,
  maxHealth: 58,
  attackDamage: Math.ceil(goblinAttackDamage * 1.6),
  moveSpeed: 28,
  color: '#1d4a1d',
  stunThreshold: 90,
  stunBuildupPerHit: 26,
  knockbackResist: 0.28,
  goldDrop: 8
};

const skeletonEliteConfig = {
  ...skeletonVeteranConfig,
  maxHealth: 95,
  attackDamage: 12,
  moveSpeed: 24,
  color: '#808080',
  attackCooldown: 1.2,
  projectile: {
    enabled: true,
    speed: 220,
    damage: 10,
    range: 280,
    cooldown: 2.9,
    stunBuildup: 22
  },
  stunBuildupPerHit: 22,
  knockbackResist: 0.2,
  goldDrop: 10
};

const zombieEliteConfig = {
  ...zombieVeteranConfig,
  maxHealth: 105,
  attackDamage: Math.ceil(zombieAttackDamage * 1.6),
  moveSpeed: 84,
  color: '#1d3a1d',
  stunThreshold: 100,
  stunBuildupPerHit: 24,
  knockbackResist: 0.5,
  goldDrop: 9,
  weaponDropChance: 0.08,
  whetstoneDropChance: 0.10
};

const banditEliteConfig = {
  ...banditVeteranConfig,
  maxHealth: 98,
  attackDamage: Math.ceil(banditAttackDamage * 1.35),
  moveSpeed: 90,
  stunThreshold: 120,
  stunBuildupPerHit: 45,
  knockbackResist: 0.22,
  goldDrop: 12,
  weaponDropChance: 0.10,
  whetstoneDropChance: 0.11
};

const banditDaggerEliteConfig = {
  ...banditDaggerVeteranConfig,
  maxHealth: 72,
  attackDamage: Math.ceil(banditDaggerAttackDamage * 1.5),
  moveSpeed: 96,
  stunThreshold: 100,
  stunBuildupPerHit: 28,
  goldDrop: 7,
  weaponDropChance: 0.09,
  whetstoneDropChance: 0.10
};

const lesserDemonEliteConfig = {
  ...lesserDemonVeteranConfig,
  maxHealth: 78,
  attackDamage: 11,
  moveSpeed: 38,
  color: '#aa3333',
  stunBuildupPerHit: 26,
  knockbackResist: 0.35,
  lunge: {
    ...lesserDemonVeteranConfig.lunge,
    lungeDamage: 16,
    knockback: { force: 340 }
  },
  goldDrop: 9,
  weaponDropChance: 0.10,
  whetstoneDropChance: 0.12
};

const greaterDemonEliteConfig = {
  ...greaterDemonVeteranConfig,
  maxHealth: 130,
  attackDamage: 18,
  moveSpeed: 36,
  color: '#cc6666',
  stunBuildupPerHit: 32,
  knockbackResist: 0.45,
  pillarFlame: {
    ...greaterDemonVeteranConfig.pillarFlame,
    damage: 12,
    cooldown: 14.0
  },
  goldDrop: 16,
  weaponDropChance: 0.18,
  whetstoneDropChance: 0.14
};

const goblinChieftainEliteConfig = {
  ...goblinChieftainVeteranConfig,
  maxHealth: 110,
  moveSpeed: 58,
  attackDamage: Math.ceil((heavySmash.damage ?? 16) * 1.45),
  stunThreshold: 100,
  stunBuildupPerHit: 32,
  knockbackResist: 0.7,
  heavySmash: {
    ...goblinChieftainVeteranConfig.heavySmash,
    damage: Math.ceil((heavySmash.damage ?? 16) * 1.45),
    knockbackForce: 360
  },
  goldDrop: 12,
  weaponDropChance: 0.14,
  whetstoneDropChance: 0.12
};

const fireDragonEliteConfig = {
  ...fireDragonAlphaConfig,
  maxHealth: 680,
  moveSpeed: 40,
  attackDamage: Math.ceil(fireDragonAttackDamage * 1.45),
  stunThreshold: 210,
  stunBuildupPerHit: 22,
  knockbackResist: 0.64,
  lunge: {
    ...fireDragonAlphaConfig.lunge,
    lungeDamage: 38,
    knockback: { force: 460 }
  },
  projectile: {
    ...fireDragonAlphaConfig.projectile,
    damage: 42,
    cooldown: 2.8
  },
  goldDrop: 52,
  weaponDropChance: 0.26,
  whetstoneDropChance: 0.16
};

/** Bandit dagger stats (used when a bandit randomly rolls dagger). Not a separate enemy type. */
export function getBanditDaggerConfigForType(type: string): Record<string, unknown> | null {
  if (type === 'bandit') return banditDaggerConfig as unknown as Record<string, unknown>;
  if (type === 'banditVeteran') return banditDaggerVeteranConfig as unknown as Record<string, unknown>;
  if (type === 'banditElite') return banditDaggerEliteConfig as unknown as Record<string, unknown>;
  return null;
}

/** Bandit sword stats (used when a bandit randomly rolls sword). Same base as mace bandit, weapon overridden to sword. */
export function getBanditSwordConfigForType(type: string): Record<string, unknown> | null {
  if (type === 'bandit') return banditConfig as unknown as Record<string, unknown>;
  if (type === 'banditVeteran') return banditVeteranConfig as unknown as Record<string, unknown>;
  if (type === 'banditElite') return banditEliteConfig as unknown as Record<string, unknown>;
  return null;
}

export const EnemyGoblin = EnemyType.fromConfig(goblinConfig);
export const EnemySkeleton = EnemyType.fromConfig(skeletonConfig);
export const EnemyLesserDemon = EnemyType.fromConfig(lesserDemonConfig);
export const EnemyGreaterDemon = EnemyType.fromConfig(greaterDemonConfig);
export const EnemyGoblinChieftain = EnemyType.fromConfig(goblinChieftainConfig);
export const EnemyBandit = EnemyType.fromConfig(banditConfig);
export const EnemyGoblinBrute = EnemyType.fromConfig(goblinBruteConfig);
export const EnemySkeletonVeteran = EnemyType.fromConfig(skeletonVeteranConfig);
export const EnemyZombie = EnemyType.fromConfig(zombieConfig);
export const EnemyZombieVeteran = EnemyType.fromConfig(zombieVeteranConfig);
export const EnemyBanditVeteran = EnemyType.fromConfig(banditVeteranConfig);
export const EnemyLesserDemonVeteran = EnemyType.fromConfig(lesserDemonVeteranConfig);
export const EnemyGreaterDemonVeteran = EnemyType.fromConfig(greaterDemonVeteranConfig);
export const EnemyGoblinChieftainVeteran = EnemyType.fromConfig(goblinChieftainVeteranConfig);
export const EnemyFireDragonAlpha = EnemyType.fromConfig(fireDragonAlphaConfig);
export const EnemyGoblinElite = EnemyType.fromConfig(goblinEliteConfig);
export const EnemySkeletonElite = EnemyType.fromConfig(skeletonEliteConfig);
export const EnemyZombieElite = EnemyType.fromConfig(zombieEliteConfig);
export const EnemyBanditElite = EnemyType.fromConfig(banditEliteConfig);
export const EnemyLesserDemonElite = EnemyType.fromConfig(lesserDemonEliteConfig);
export const EnemyGreaterDemonElite = EnemyType.fromConfig(greaterDemonEliteConfig);
export const EnemyGoblinChieftainElite = EnemyType.fromConfig(goblinChieftainEliteConfig);
export const EnemyFireDragonElite = EnemyType.fromConfig(fireDragonEliteConfig);
export const EnemyTrainingDummy = EnemyType.fromConfig(trainingDummyConfig);
export const EnemyFireDragon = EnemyType.fromConfig(fireDragonConfig);
