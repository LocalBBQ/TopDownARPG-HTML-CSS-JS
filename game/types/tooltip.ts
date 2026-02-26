/** Unified tooltip hover: weapon, armor, whetstone, herb, or mushroom slot; null when none. Used by Game and InventoryChestCanvas. */
export type TooltipHover =
    | { type: 'weapon'; weaponKey: string; x: number; y: number; durability?: number; prefixId?: string; suffixId?: string }
    | { type: 'armor'; armorKey: string; x: number; y: number; durability?: number }
    | { type: 'whetstone'; x: number; y: number; count: number }
    | { type: 'herb'; x: number; y: number; count: number }
    | { type: 'mushroom'; x: number; y: number; count: number }
    | null;
