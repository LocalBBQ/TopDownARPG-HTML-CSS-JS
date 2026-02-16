/**
 * HUD and inventory panel updates: health/stamina orbs, inventory screen, player portrait, weapon chest overlay.
 */
import type { Entity } from '../entities/Entity.js';
import type { PlayingStateShape } from '../state/PlayingState.js';
import { MAX_WEAPON_DURABILITY } from '../state/PlayingState.js';
import { Health } from '../components/Health.js';
import { Stamina } from '../components/Stamina.js';
import { Combat } from '../components/Combat.js';
import { PlayerHealing } from '../components/PlayerHealing.js';
import { StatusEffects } from '../components/StatusEffects.js';
import { SpriteUtils } from '../utils/SpriteUtils.js';
import { Weapons } from '../weapons/WeaponsRegistry.js';
import { CHEST_WEAPON_ORDER, getWeaponDisplayName, getWeaponSymbol } from './InventoryChestCanvas.js';

export interface SystemsLike {
    get(name: string): unknown;
}

export interface EntitiesLike {
    get(id: string): Entity | undefined;
}

export interface HUDControllerContext {
    playingState: PlayingStateShape;
    systems: SystemsLike;
    entities: EntitiesLike;
}

const DRAG_TYPE_WEAPON = 'application/x-arpg-weapon-key';
const DRAG_SOURCE_SLOT = 'application/x-arpg-source-slot';

export class HUDController {
    private ctx: HUDControllerContext;
    private chestGridInitialized = false;

    constructor(context: HUDControllerContext) {
        this.ctx = context;
        this.setupChestOverlay();
        this.setupEquipmentDropTargets();
        this.setupInventoryGridDropTargets();
    }

    private setupChestOverlay(): void {
        const overlay = document.getElementById('weapon-chest-overlay');
        if (!overlay) return;
        overlay.addEventListener('click', (e) => this.handleChestOverlayClick(e));
        const chestGrid = document.getElementById('weapon-chest-grid');
        if (chestGrid) {
            chestGrid.addEventListener('dragover', (e) => this.handleChestSlotDragover(e));
            chestGrid.addEventListener('dragleave', (e) => this.handleChestSlotDragleave(e));
            chestGrid.addEventListener('drop', (e) => this.handleChestSlotDrop(e));
        }
    }

    private handleChestSlotDragover(e: DragEvent): void {
        const slot = (e.target as HTMLElement).closest?.('.weapon-chest-slot');
        if (!slot || !e.dataTransfer || !this.getWeaponKeyFromDrag(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        (slot as HTMLElement).classList.add('drag-over');
    }

    private handleChestSlotDragleave(e: DragEvent): void {
        const slot = (e.target as HTMLElement).closest?.('.weapon-chest-slot');
        if (slot) (slot as HTMLElement).classList.remove('drag-over');
    }

    private handleChestSlotDrop(e: DragEvent): void {
        const slot = (e.target as HTMLElement).closest?.('.weapon-chest-slot');
        if (!slot) return;
        (slot as HTMLElement).classList.remove('drag-over');
        e.preventDefault();
        const sourceStr = e.dataTransfer?.getData(DRAG_SOURCE_SLOT) ?? '';
        const sourceIndex = sourceStr === '' ? -1 : parseInt(sourceStr, 10);
        if (sourceIndex >= 0 && sourceIndex < 24 && !isNaN(sourceIndex)) {
            const ps = this.ctx.playingState;
            if (ps.inventorySlots && ps.inventorySlots.length === 24) {
                ps.inventorySlots[sourceIndex] = null;
                this.refreshInventoryGridFromState();
            }
        }
    }

    private setupEquipmentDropTargets(): void {
        document.querySelectorAll('.equipment-drop-target').forEach((el) => {
            const target = el as HTMLElement;
            target.addEventListener('dragover', (e) => this.handleDragOver(e));
            target.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            target.addEventListener('drop', (e) => this.handleDrop(e));
        });
    }

    private setupInventoryGridDropTargets(): void {
        const grid = document.getElementById('inventory-grid');
        if (!grid) return;
        grid.addEventListener('dragover', (e) => this.handleInventorySlotDragover(e));
        grid.addEventListener('dragleave', (e) => this.handleInventorySlotDragleave(e));
        grid.addEventListener('drop', (e) => this.handleInventorySlotDrop(e));
        grid.addEventListener('dragstart', (e) => this.handleInventoryDragStart(e));
    }

    private handleInventorySlotDragover(e: DragEvent): void {
        const slot = (e.target as HTMLElement).closest?.('.inventory-slot');
        if (!slot || !e.dataTransfer || !this.getWeaponKeyFromDrag(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        (slot as HTMLElement).classList.add('drag-over');
    }

    private handleInventorySlotDragleave(e: DragEvent): void {
        const slot = (e.target as HTMLElement).closest?.('.inventory-slot');
        if (slot) (slot as HTMLElement).classList.remove('drag-over');
    }

    private handleInventorySlotDrop(e: DragEvent): void {
        const slot = (e.target as HTMLElement).closest?.('.inventory-slot');
        if (!slot) return;
        (slot as HTMLElement).classList.remove('drag-over');
        e.preventDefault();
        const weaponKey = this.getWeaponKeyFromDrag(e);
        if (!weaponKey) return;
        const targetIndex = parseInt((slot as HTMLElement).getAttribute('data-slot') ?? '', 10);
        if (isNaN(targetIndex) || targetIndex < 0 || targetIndex > 23) return;
        const ps = this.ctx.playingState;
        if (!ps.inventorySlots || ps.inventorySlots.length !== 24) return;
        const sourceStr = e.dataTransfer?.getData(DRAG_SOURCE_SLOT) ?? '';
        const sourceIndex = sourceStr === '' ? -1 : parseInt(sourceStr, 10);
        if (sourceIndex >= 0 && sourceIndex < 24 && !isNaN(sourceIndex)) {
            const a = ps.inventorySlots[sourceIndex];
            const b = ps.inventorySlots[targetIndex];
            ps.inventorySlots[sourceIndex] = b;
            ps.inventorySlots[targetIndex] = a;
        } else {
            ps.inventorySlots[targetIndex] = weaponKey;
        }
        this.refreshInventoryGridFromState();
    }

    private handleInventoryDragStart(e: DragEvent): void {
        const el = (e.target as HTMLElement).closest?.('.inventory-slot[data-weapon-key]') as HTMLElement | null;
        if (!el || !e.dataTransfer) return;
        const key = el.getAttribute('data-weapon-key');
        if (!key) return;
        e.dataTransfer.setData(DRAG_TYPE_WEAPON, key);
        e.dataTransfer.effectAllowed = 'move';
        const slotIndex = el.getAttribute('data-slot');
        if (slotIndex != null) e.dataTransfer.setData(DRAG_SOURCE_SLOT, slotIndex);
        e.dataTransfer.setDragImage(el, 0, 0);
    }

    private handleDragOver(e: DragEvent): void {
        if (!e.dataTransfer || !this.getWeaponKeyFromDrag(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        (e.currentTarget as HTMLElement).classList.add('drag-over');
    }

    private handleDragLeave(e: DragEvent): void {
        (e.currentTarget as HTMLElement).classList.remove('drag-over');
    }

    private getWeaponKeyFromDrag(e: DragEvent): string | null {
        const key = e.dataTransfer?.getData(DRAG_TYPE_WEAPON);
        return key && Weapons[key] ? key : null;
    }

    private handleDrop(e: DragEvent): void {
        (e.currentTarget as HTMLElement).classList.remove('drag-over');
        e.preventDefault();
        const weaponKey = this.getWeaponKeyFromDrag(e);
        const slot = (e.currentTarget as HTMLElement).getAttribute('data-equip-slot');
        if (!weaponKey || (slot !== 'mainhand' && slot !== 'offhand')) return;
        this.applyWeaponToSlot(weaponKey, slot as 'mainhand' | 'offhand');
        this.refreshChestEquipmentLabels();
        this.refreshInventoryEquipmentLabels();
    }

    private applyWeaponToSlot(weaponKey: string, slot: 'mainhand' | 'offhand'): void {
        const ps = this.ctx.playingState;
        const weapon = Weapons[weaponKey] as { twoHanded?: boolean } | undefined;
        if (slot === 'mainhand') {
            ps.equippedMainhandKey = weaponKey;
            ps.equippedMainhandDurability = MAX_WEAPON_DURABILITY;
            if (weapon?.twoHanded) ps.equippedOffhandKey = 'none';
        } else {
            ps.equippedOffhandKey = weaponKey;
            ps.equippedOffhandDurability = MAX_WEAPON_DURABILITY;
        }
        const player = this.ctx.entities.get('player');
        if (player) {
            const combat = player.getComponent(Combat) as Combat | null;
            if (combat && combat.isPlayer) {
                combat.stopBlocking();
                const mainhand = ps.equippedMainhandKey && ps.equippedMainhandKey !== 'none'
                    ? (Weapons[ps.equippedMainhandKey] ?? null)
                    : null;
                const offhand = ps.equippedOffhandKey && ps.equippedOffhandKey !== 'none'
                    ? (Weapons[ps.equippedOffhandKey] ?? null)
                    : null;
                (combat as Combat & { setWeapons(m: unknown, o?: unknown): void }).setWeapons(mainhand, offhand);
            }
        }
        this.refreshChestGridEquippedState();
    }

    private refreshChestEquipmentLabels(): void {
        const ps = this.ctx.playingState;
        const mainEl = document.getElementById('chest-equip-mainhand');
        const offEl = document.getElementById('chest-equip-offhand');
        const mainName = getWeaponDisplayName(ps.equippedMainhandKey);
        const offName = getWeaponDisplayName(ps.equippedOffhandKey);
        const mainPct = ps.equippedMainhandDurability != null ? Math.round((100 * ps.equippedMainhandDurability) / MAX_WEAPON_DURABILITY) : null;
        const offPct = ps.equippedOffhandDurability != null ? Math.round((100 * ps.equippedOffhandDurability) / MAX_WEAPON_DURABILITY) : null;
        const mainText = mainName === '—' || !mainName ? mainName : (mainPct != null ? `${mainName} (${mainPct}%)` : mainName);
        const offText = offName === '—' || !offName ? offName : (offPct != null ? `${offName} (${offPct}%)` : offName);
        if (mainEl) {
            mainEl.textContent = mainText;
            mainEl.classList.toggle('empty', mainName === '—' || !mainName);
            mainEl.closest('.equipment-slot')?.classList.toggle('equipped', mainName !== '—' && !!mainName);
        }
        if (offEl) {
            offEl.textContent = offText;
            offEl.classList.toggle('empty', offName === '—' || !offName);
            offEl.closest('.equipment-slot')?.classList.toggle('equipped', offName !== '—' && !!offName);
        }
    }

    private refreshInventoryEquipmentLabels(): void {
        const ps = this.ctx.playingState;
        const mainEl = document.getElementById('inventory-equip-mainhand');
        const offEl = document.getElementById('inventory-equip-offhand');
        const mainName = getWeaponDisplayName(ps.equippedMainhandKey);
        const offName = getWeaponDisplayName(ps.equippedOffhandKey);
        const mainPct = ps.equippedMainhandDurability != null ? Math.round((100 * ps.equippedMainhandDurability) / MAX_WEAPON_DURABILITY) : null;
        const offPct = ps.equippedOffhandDurability != null ? Math.round((100 * ps.equippedOffhandDurability) / MAX_WEAPON_DURABILITY) : null;
        const mainText = mainName === '—' || !mainName ? mainName : (mainPct != null ? `${mainName} (${mainPct}%)` : mainName);
        const offText = offName === '—' || !offName ? offName : (offPct != null ? `${offName} (${offPct}%)` : offName);
        if (mainEl) {
            mainEl.textContent = mainText;
            mainEl.classList.toggle('empty', mainName === '—' || !mainName);
            mainEl.closest('.equipment-slot')?.classList.toggle('equipped', mainName !== '—' && !!mainName);
        }
        if (offEl) {
            offEl.textContent = offText;
            offEl.classList.toggle('empty', offName === '—' || !offName);
            offEl.closest('.equipment-slot')?.classList.toggle('equipped', offName !== '—' && !!offName);
        }
    }

    private handleChestOverlayClick(e: MouseEvent): void {
        const target = (e.target as HTMLElement);
        const weaponSlot = target.closest?.('[data-weapon-key]') as HTMLElement | null;
        const backBtn = target.closest?.('[data-action="back"]');
        if (weaponSlot) {
            const key = weaponSlot.getAttribute('data-weapon-key');
            if (key && Weapons[key]) {
                this.applyWeaponToSlot(key, 'mainhand');
                this.refreshChestGridEquippedState();
                this.refreshChestEquipmentLabels();
            }
        } else if (backBtn) {
            this.ctx.playingState.chestOpen = false;
            this.ctx.playingState.chestUseCooldown = 0;
            this.setChestOverlayVisible(false);
        }
    }

    private initChestGrid(): void {
        if (this.chestGridInitialized) return;
        const grid = document.getElementById('weapon-chest-grid');
        if (!grid) return;
        for (const key of CHEST_WEAPON_ORDER) {
            if (!Weapons[key]) continue;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'weapon-chest-slot';
            btn.setAttribute('data-weapon-key', key);
            btn.draggable = true;
            btn.textContent = getWeaponSymbol(key);
            btn.title = getWeaponDisplayName(key);
            btn.addEventListener('dragstart', (e) => this.handleWeaponDragStart(e));
            grid.appendChild(btn);
        }
        this.chestGridInitialized = true;
    }

    private handleWeaponDragStart(e: DragEvent): void {
        const el = (e.target as HTMLElement).closest?.('[data-weapon-key]') as HTMLElement | null;
        if (!el || !e.dataTransfer) return;
        const key = el.getAttribute('data-weapon-key');
        if (!key) return;
        e.dataTransfer.setData(DRAG_TYPE_WEAPON, key);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setDragImage(el, 0, 0);
    }

    private refreshChestGridEquippedState(): void {
        const grid = document.getElementById('weapon-chest-grid');
        if (!grid) return;
        const mainhand = this.ctx.playingState.equippedMainhandKey;
        const offhand = this.ctx.playingState.equippedOffhandKey;
        for (const el of grid.querySelectorAll('.weapon-chest-slot')) {
            const slot = el as HTMLElement;
            const key = slot.getAttribute('data-weapon-key');
            slot.classList.toggle('equipped', key === mainhand || key === offhand);
        }
    }

    setChestOverlayVisible(visible: boolean): void {
        const el = document.getElementById('weapon-chest-overlay');
        if (el) {
            el.classList.toggle('hidden', !visible);
            if (visible) {
                this.initChestGrid();
                this.refreshChestGridEquippedState();
                this.refreshChestEquipmentLabels();
            }
        }
    }

    update(player: Entity | undefined) {
        if (!player) return;

        const health = player.getComponent(Health);
        const stamina = player.getComponent(Stamina);
        const combat = player.getComponent(Combat);

        if (health) {
            const healthPercent = health.percent * 100;
            const healthFillEl = document.getElementById('health-orb-fill');
            if (healthFillEl) healthFillEl.style.height = healthPercent + '%';
            const healthTextEl = document.getElementById('health-text');
            if (healthTextEl) healthTextEl.textContent =
                Math.floor(health.currentHealth) + '/' + health.maxHealth;
        }

        if (stamina) {
            const staminaPercent = stamina.percent * 100;
            const staminaFillEl = document.getElementById('stamina-orb-fill');
            if (staminaFillEl) staminaFillEl.style.height = staminaPercent + '%';
            const staminaTextEl = document.getElementById('stamina-text');
            if (staminaTextEl) staminaTextEl.textContent =
                Math.floor(stamina.currentStamina) + '/' + stamina.maxStamina;
            const staminaOrbEl = document.getElementById('stamina-orb');
            if (staminaOrbEl) {
                if (combat && combat.dashAttackFlashUntil > Date.now()) {
                    staminaOrbEl.classList.add('stamina-pulse');
                } else {
                    staminaOrbEl.classList.remove('stamina-pulse');
                }
            }
        }

        const healing = player.getComponent(PlayerHealing);
        const healChargesEl = document.getElementById('heal-charges');
        if (healing && healChargesEl) {
            healChargesEl.textContent = healing.charges + '/' + healing.maxCharges;
        }

        const statusEffects = player.getComponent(StatusEffects);
        const stunBarEl = document.getElementById('stun-bar');
        if (statusEffects && stunBarEl) {
            const pct = Math.min(100, statusEffects.stunMeterPercent * 100);
            stunBarEl.style.width = pct + '%';
        }

        const stunDurationRow = document.getElementById('stun-duration-row');
        const stunDurationBar = document.getElementById('stun-duration-bar');
        if (statusEffects && stunDurationRow && stunDurationBar) {
            if (statusEffects.isStunned) {
                stunDurationRow.style.display = '';
                const remain = statusEffects.stunDurationPercentRemaining * 100;
                stunDurationBar.style.width = remain + '%';
            } else {
                stunDurationRow.style.display = 'none';
            }
        }
    }

    setInventoryPanelVisible(visible: boolean) {
        const el = document.getElementById('inventory-screen');
        if (el) el.classList.toggle('hidden', !visible);
    }

    refreshInventoryPanel() {
        const player = this.ctx.entities.get('player');
        if (!player) return;
        const health = player.getComponent(Health);
        const stamina = player.getComponent(Stamina);
        const combat = player.getComponent(Combat);
        const healing = player.getComponent(PlayerHealing);

        const healthEl = document.getElementById('inventory-stat-health');
        const staminaEl = document.getElementById('inventory-stat-stamina');
        const healthBarEl = document.getElementById('inventory-bar-health');
        const staminaBarEl = document.getElementById('inventory-bar-stamina');
        const damageEl = document.getElementById('inventory-stat-damage');
        const mainhandEl = document.getElementById('inventory-equip-mainhand');
        const offhandEl = document.getElementById('inventory-equip-offhand');
        const healChargesEl = document.getElementById('inventory-stat-heal');
        const killsEl = document.getElementById('inventory-stat-kills');
        const goldEl = document.getElementById('inventory-stat-gold');
        if (healthEl && health) healthEl.textContent = Math.floor(health.currentHealth) + ' / ' + health.maxHealth;
        if (staminaEl && stamina) staminaEl.textContent = Math.floor(stamina.currentStamina) + ' / ' + stamina.maxStamina;
        if (healthBarEl && health) healthBarEl.style.width = (health.percent * 100) + '%';
        if (staminaBarEl && stamina) staminaBarEl.style.width = (stamina.percent * 100) + '%';
        if (healChargesEl && healing) healChargesEl.textContent = healing.charges + ' / ' + healing.maxCharges;
        if (damageEl && combat && combat.attackHandler) {
            const dmg = combat.attackHandler.attackDamage != null ? Math.floor(combat.attackHandler.attackDamage) : '—';
            damageEl.textContent = String(dmg);
        }
        if (killsEl) killsEl.textContent = String(this.ctx.playingState.killsThisLife);
        if (goldEl) goldEl.textContent = String(this.ctx.playingState.gold);

        this.refreshInventoryEquipmentLabels();
        this.refreshInventoryGridFromState();
        this.drawInventoryPlayerPortrait();
    }

    drawInventoryPlayerPortrait() {
        const canvas = document.getElementById('inventory-player-portrait') as HTMLCanvasElement | null;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const spriteManager = this.ctx.systems.get('sprites') as { knightSheets?: Record<string, string>; getSpriteSheet?(key: string): { rows: number; cols: number; image?: HTMLImageElement } | null } | undefined;
        if (!spriteManager) return;
        const knightSheets = spriteManager.knightSheets || {};
        const idleKey = knightSheets.idle || knightSheets.walk || null;
        if (!idleKey) return;
        const sheet = spriteManager.getSpriteSheet?.(idleKey);
        if (!sheet || !sheet.image) return;

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        const frontFrameCol = 0;
        const frontFrameRow = 0;
        const frameCoords = SpriteUtils.getFrameCoords(sheet, frontFrameRow, frontFrameCol);
        if (!frameCoords || frameCoords.sourceWidth <= 0 || frameCoords.sourceHeight <= 0) return;
        ctx.imageSmoothingEnabled = true;
        (ctx as CanvasRenderingContext2D).imageSmoothingQuality = 'high';
        ctx.drawImage(
            sheet.image,
            frameCoords.sourceX, frameCoords.sourceY, frameCoords.sourceWidth, frameCoords.sourceHeight,
            0, 0, w, h
        );
    }

    private ensureInventoryInitialized(): void {
        const ps = this.ctx.playingState;
        if (!ps.inventorySlots || ps.inventorySlots.length !== 24) {
            ps.inventorySlots = Array(24).fill(null) as (string | null)[];
        }
        const hasAny = ps.inventorySlots.some((s) => s != null);
        if (!hasAny) {
            for (let i = 0; i < CHEST_WEAPON_ORDER.length && i < 24; i++) {
                ps.inventorySlots[i] = CHEST_WEAPON_ORDER[i];
            }
        }
    }

    private refreshInventoryGridFromState(): void {
        this.ensureInventoryInitialized();
        const grid = document.getElementById('inventory-grid');
        if (!grid) return;
        const slots = grid.querySelectorAll('.inventory-slot');
        const ps = this.ctx.playingState;
        const list = ps.inventorySlots ?? Array(24).fill(null) as (string | null)[];
        for (let i = 0; i < 24 && i < slots.length; i++) {
            const slot = slots[i] as HTMLElement;
            const key = list[i];
            if (key && Weapons[key]) {
                slot.setAttribute('data-weapon-key', key);
                slot.textContent = getWeaponSymbol(key);
                slot.title = getWeaponDisplayName(key);
                slot.draggable = true;
            } else {
                slot.removeAttribute('data-weapon-key');
                slot.textContent = '';
                slot.title = '';
                slot.draggable = false;
            }
        }
    }

    getWeaponDisplayName(key: string): string {
        return getWeaponDisplayName(key);
    }
}
