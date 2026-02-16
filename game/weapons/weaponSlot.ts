/**
 * Single source of truth for which equipment slot a weapon can go in.
 * Main-hand weapons only in main hand; off-hand weapons only in off hand.
 */
import { Weapons } from './WeaponsRegistry.js';

type WeaponLike = { twoHanded?: boolean; offhandOnly?: boolean };
export type EquipSlot = 'mainhand' | 'offhand';

function getWeapon(key: string): WeaponLike | undefined {
  return Weapons[key] as WeaponLike | undefined;
}

/**
 * Returns the only slot this weapon can be equipped in.
 * offhandOnly -> 'offhand'; otherwise (including two-handed) -> 'mainhand'.
 */
export function getEquipSlotForWeapon(weaponKey: string): EquipSlot {
  const weapon = getWeapon(weaponKey);
  return weapon?.offhandOnly === true ? 'offhand' : 'mainhand';
}

/**
 * True iff this weapon is allowed in the given slot.
 */
export function canEquipWeaponInSlot(weaponKey: string, slot: EquipSlot): boolean {
  return getEquipSlotForWeapon(weaponKey) === slot;
}
