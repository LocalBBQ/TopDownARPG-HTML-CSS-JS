/**
 * Canvas-rendered stats HUD (health/stamina orbs, stun, heal charges).
 * Drawn in the game render loop so it respects draw order and is covered by inventory/other UI.
 */
import type { EntityShape } from '../types/entity.js';
import { Health } from '../components/Health.js';
import { Rally } from '../components/Rally.js';
import { Stamina } from '../components/Stamina.js';
import { Combat } from '../components/Combat.js';
import { PlayerHealing } from '../components/PlayerHealing.js';
import { StatusEffects } from '../components/StatusEffects.js';
import { DELVE_LEVEL } from '../config/questConfig.js';

const PAD = 16;
const ORB_RADIUS = 60;
const ORB_SIDE = 160;
const ORB_Y_OFFSET = 50;
/** Extra space below orbs so HEALTH/STAMINA label and value text are visible */
const ORB_TEXT_SPACE = 44;
const BOTTOM_BAR_PAD_BOTTOM = 10;
const STUN_BAR_W = 72;
const STUN_BAR_H = 12;
const POTION_W = 26;
const POTION_H = 34;
/** Card style: rounded rect matching orb frame */
const CARD_RADIUS = 8;
const CARD_PAD = 10;
/** Combined stun+potion card width; sits left of skill row */
const STUN_POTION_CARD_W = 160;
const STUN_POTION_CARD_H = 52;
/** Single row of 4 skill slots (grid squares) */
const SKILL_SLOT_COUNT = 4;
const SKILL_SLOT_SIZE = 48;
const SKILL_SLOT_GAP = 6;
const SKILL_ROW_W = SKILL_SLOT_COUNT * SKILL_SLOT_SIZE + (SKILL_SLOT_COUNT - 1) * SKILL_SLOT_GAP;
const BAR_GAP = 12;
const BOTTOM_BAR_TOTAL_W = STUN_POTION_CARD_W + BAR_GAP + SKILL_ROW_W;
const FONT_LABEL = '700 14px Cinzel, Georgia, serif';
const FONT_TEXT = '700 15px Cinzel, Georgia, serif';
const FONT_STAT = '600 15px Cinzel, Georgia, serif';
const COLOR_LABEL = '#c9a227';
const COLOR_TEXT = '#d4bc8c';
const COLOR_STUN_LABEL = '#706858';

export interface StatsHUDData {
  delveFloor: number;
}

/**
 * Render the stats HUD on the game canvas. Call after world/entities, before inventory.
 * Uses same visual style as the original DOM HUD (orbs, bottom bar, stun, heal charges).
 */
export function renderStatsHUD(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  player: EntityShape | undefined,
  currentLevel: number,
  data: StatsHUDData
): void {
  if (!player) return;
  const health = player.getComponent(Health);
  const stamina = player.getComponent(Stamina);
  const rally = player.getComponent(Rally);
  const combat = player.getComponent(Combat);
  const healing = player.getComponent(PlayerHealing);
  const statusEffects = player.getComponent(StatusEffects);

  const W = canvas.width;
  const H = canvas.height;

  const leftOrbX = PAD + ORB_SIDE / 2 + ORB_RADIUS;
  const rightOrbX = W - PAD - ORB_SIDE / 2 - ORB_RADIUS;
  const orbCenterY = H - PAD - 6 - ORB_RADIUS - 20 - ORB_TEXT_SPACE + ORB_Y_OFFSET;

  ctx.save();

  // Effect stacks (e.g. Rising Gale) – above orbs, center
  const weapon = combat?.attackHandler?.weapon ?? (combat?.playerAttack as { weapon?: { name?: string } } | undefined)?.weapon;
  const weaponName = weapon && typeof weapon === 'object' && (weapon as { name?: string }).name;
  if (weaponName === 'Blessed Winds' && statusEffects != null) {
    const stacks = statusEffects.risingGaleStacks ?? 0;
    ctx.fillStyle = stacks >= 2 ? '#c9a227' : '#b89870';
    ctx.font = '600 14px Cinzel, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Rising Gale ${stacks}/2`, canvas.width / 2, orbCenterY - ORB_RADIUS - 50);
  }

  // Health orb
  if (health) {
    const healthPct = Math.max(0, Math.min(1, health.percent));
    drawOrb(ctx, leftOrbX, orbCenterY, ORB_RADIUS, healthPct, [
      [0, '#e04040'],
      [0.3, '#b02828'],
      [0.6, '#8b2020'],
      [1, '#5c1010']
    ]);
    ctx.fillStyle = COLOR_LABEL;
    ctx.font = FONT_LABEL;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const rallyAmount = rally && rally.rallyPool > 0 ? Math.floor(rally.rallyPool) : 0;
    const healthStr =
      rallyAmount > 0
        ? `${Math.floor(health.currentHealth)}/${health.maxHealth} (+${rallyAmount} rally)`
        : `${Math.floor(health.currentHealth)}/${health.maxHealth}`;
    ctx.fillText(healthStr, leftOrbX, orbCenterY + ORB_RADIUS + 20);
    ctx.fillStyle = COLOR_LABEL;
    ctx.font = '700 12px Cinzel, Georgia, serif';
    ctx.fillText('HEALTH', leftOrbX, orbCenterY + ORB_RADIUS + 8);
  }

  // Stamina orb
  if (stamina) {
    const staminaPct = Math.max(0, Math.min(1, stamina.percent));
    const pulse =
      combat && combat.dashAttackFlashUntil && performance.now() < combat.dashAttackFlashUntil;
    drawOrb(ctx, rightOrbX, orbCenterY, ORB_RADIUS, staminaPct, [
      [0, '#4a9070'],
      [0.3, '#2a7050'],
      [0.6, '#1e5038'],
      [1, '#0f2520']
    ], pulse);
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = FONT_TEXT;
    ctx.textAlign = 'center';
    ctx.fillText(
      `${Math.floor(stamina.currentStamina)}/${stamina.maxStamina}`,
      rightOrbX,
      orbCenterY + ORB_RADIUS + 20
    );
    ctx.fillStyle = COLOR_LABEL;
    ctx.font = '700 12px Cinzel, Georgia, serif';
    ctx.fillText('STAMINA', rightOrbX, orbCenterY + ORB_RADIUS + 8);
  }

  // Bottom row: one centered bar = [ combined stun+potion card | 4 skill slots ]
  const barHeight = Math.max(STUN_POTION_CARD_H, SKILL_SLOT_SIZE);
  const bottomRowY = H - PAD - BOTTOM_BAR_PAD_BOTTOM - barHeight - 8;
  const barLeftX = W / 2 - BOTTOM_BAR_TOTAL_W / 2;
  const stunPotionCardX = barLeftX;
  const skillRowX = barLeftX + STUN_POTION_CARD_W + BAR_GAP;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Combined stun + potion card (left part of bar)
  roundRect(ctx, stunPotionCardX, bottomRowY, STUN_POTION_CARD_W, STUN_POTION_CARD_H, CARD_RADIUS);
  ctx.fillStyle = 'rgba(28, 22, 18, 0.92)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(61, 40, 23, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const cardInnerX = stunPotionCardX + CARD_PAD;
  const cardMidY = bottomRowY + STUN_POTION_CARD_H / 2;

  // Stun (left side of combined card)
  if (statusEffects) {
    const barY = cardMidY - STUN_BAR_H / 2;
    ctx.fillStyle = COLOR_STUN_LABEL;
    ctx.font = '600 10px Cinzel, Georgia, serif';
    ctx.fillText('Stun', cardInnerX, barY + STUN_BAR_H / 2);
    const trackX = cardInnerX + 28;
    ctx.fillStyle = '#0f0a06';
    roundRect(ctx, trackX, barY, STUN_BAR_W, STUN_BAR_H, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(50, 40, 35, 0.6)';
    ctx.lineWidth = 1;
    roundRect(ctx, trackX, barY, STUN_BAR_W, STUN_BAR_H, 3);
    ctx.stroke();
    const stunPct = Math.min(1, statusEffects.stunMeterPercent ?? 0);
    ctx.fillStyle = '#5a5a5a';
    if (stunPct > 0.01) {
      roundRect(ctx, trackX, barY, STUN_BAR_W * stunPct, STUN_BAR_H, 0);
      ctx.fill();
    }
    if (statusEffects.isStunned) {
      const remainPct = Math.max(0, statusEffects.stunDurationPercentRemaining ?? 0);
      ctx.fillStyle = '#cc8800';
      if (remainPct > 0.01) {
        roundRect(ctx, trackX, barY, STUN_BAR_W * remainPct, STUN_BAR_H, 0);
        ctx.fill();
      }
      ctx.fillStyle = COLOR_STUN_LABEL;
      ctx.font = '600 9px Cinzel, Georgia, serif';
      ctx.fillText('Stunned', trackX + STUN_BAR_W + 4, barY + STUN_BAR_H / 2);
    }
  }

  // Potion (right side of combined card)
  if (healing) {
    const potionX = cardInnerX + STUN_BAR_W + 28 + 8;
    const potionY = cardMidY - POTION_H / 2;
    const fillPct = healing.maxCharges > 0 ? healing.charges / healing.maxCharges : 1;
    ctx.fillStyle = 'rgba(20, 12, 8, 0.95)';
    roundRect(ctx, potionX, potionY, POTION_W, POTION_H, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80, 50, 30, 0.7)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, potionX, potionY, POTION_W, POTION_H, 4);
    ctx.stroke();
    ctx.fillStyle = '#902020';
    const fillH = Math.max(0, (POTION_H - 4) * fillPct);
    if (fillH > 0) {
      roundRect(ctx, potionX + 2, potionY + POTION_H - fillH - 2, POTION_W - 4, fillH, 2);
      ctx.fill();
    }
    ctx.fillStyle = COLOR_LABEL;
    ctx.font = '700 10px Cinzel, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('POTION', potionX + POTION_W / 2, potionY - 4);
    ctx.fillStyle = '#d4bc8c';
    ctx.font = '700 13px Cinzel, Georgia, serif';
    ctx.fillText(`×${healing.charges}`, potionX + POTION_W / 2, potionY + POTION_H + 10);
    ctx.textAlign = 'left';
  }

  // 4 skill slots: single row of grid squares, centered in their row
  const skillRowY = bottomRowY + (barHeight - SKILL_SLOT_SIZE) / 2;
  for (let i = 0; i < SKILL_SLOT_COUNT; i++) {
    const slotX = skillRowX + i * (SKILL_SLOT_SIZE + SKILL_SLOT_GAP);
    roundRect(ctx, slotX, skillRowY, SKILL_SLOT_SIZE, SKILL_SLOT_SIZE, 6);
    ctx.fillStyle = 'rgba(20, 16, 12, 0.95)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(61, 40, 23, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Placeholder: empty slot (skills can be wired later)
  }

  // Delve floor (top-center)
  if (currentLevel === DELVE_LEVEL && data.delveFloor > 0) {
    ctx.fillStyle = '#c9a227';
    ctx.font = '600 15px Cinzel, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Floor ' + data.delveFloor, W / 2, 12);
  }

  ctx.restore();
}

function drawOrb(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  fillPercent: number,
  gradientStops: [number, string][],
  pulse?: boolean
): void {
  ctx.save();
  if (fillPercent > 0.001) {
    const fillHeight = 2 * r * Math.max(0, Math.min(1, fillPercent));
    ctx.beginPath();
    ctx.rect(cx - r, cy + r - fillHeight, r * 2, fillHeight);
    ctx.clip();
    const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    gradientStops.forEach(([t, c]) => g.addColorStop(t, c));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(61, 40, 23, 0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
