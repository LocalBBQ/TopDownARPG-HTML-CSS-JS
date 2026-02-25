/**
 * SFX layer: subscribes to EventBus and plays Howler sounds.
 * Respects settings.sfxEnabled. Add OGG/MP3 files under public/sounds/ — see docs/sounds.md.
 */
import { Howl } from 'howler';
import type { EventBus } from '../core/EventBus.js';
import { EventTypes } from '../core/EventTypes.js';

const SOUND_BASE = '/sounds/';
let defaultVolume = 0.5;

export interface SoundManagerOptions {
  eventBus: EventBus;
  getSfxEnabled: () => boolean;
  /** Base URL for sound files (default /sounds/). Vite serves public/sounds at /sounds/. */
  basePath?: string;
}

/** Sound IDs used by the game. File names are {id}.ogg or {id}.mp3 in public/sounds/. */
export const SOUND_IDS = {
  HIT: 'hit',
  KILL: 'kill',
  PLAYER_HURT: 'player_hurt',
  DASH: 'dash',
  INVENTORY_OPEN: 'inventory_open',
  BLOCK: 'block',
} as const;

export type SoundId = (typeof SOUND_IDS)[keyof typeof SOUND_IDS];

export class SoundManager {
  private eventBus: EventBus;
  private getSfxEnabled: () => boolean;
  private basePath: string;
  private howls: Partial<Record<SoundId | string, Howl>> = {};

  constructor(options: SoundManagerOptions) {
    this.eventBus = options.eventBus;
    this.getSfxEnabled = options.getSfxEnabled;
    this.basePath = options.basePath ?? SOUND_BASE;
    this.subscribe();
  }

  private subscribe(): void {
    this.eventBus.onTyped(EventTypes.PLAYER_HIT_ENEMY, (payload) => {
      if (!payload.killed) this.play(SOUND_IDS.HIT);
    });
    this.eventBus.onTyped(EventTypes.PLAYER_KILLED_ENEMY, () => {
      this.play(SOUND_IDS.KILL);
    });
    this.eventBus.onTyped(EventTypes.DAMAGE_TAKEN, (data) => {
      if (data.isPlayerDamage) {
        this.play(data.isBlocked ? SOUND_IDS.BLOCK : SOUND_IDS.PLAYER_HURT);
      }
    });
    this.eventBus.on(EventTypes.PLAYER_DASH_ATTACK, () => {
      this.play(SOUND_IDS.DASH);
    });
    this.eventBus.onTyped(EventTypes.INPUT_KEYDOWN, (key) => {
      if (key === 'tab') this.play(SOUND_IDS.INVENTORY_OPEN);
    });
  }

  /**
   * Play a sound by id. File is loaded on first use from public/sounds/{id}.ogg (and .mp3 fallback if you add it).
   * If the file is missing, Howler may log a 404; add the file to public/sounds/ to fix.
   */
  play(soundId: SoundId | string, volume = defaultVolume): void {
    if (!this.getSfxEnabled()) return;
    const howl = this.getOrCreate(soundId, volume);
    howl.volume(volume);
    howl.play();
  }

  /**
   * Get or create a Howl for the given sound id. Caches by id.
   * Uses .ogg first; add .mp3 to the src array for fallback if needed.
   */
  getOrCreate(soundId: string, volume = defaultVolume): Howl {
    let howl = this.howls[soundId];
    if (howl) return howl;
    const src = [`${this.basePath}${soundId}.ogg`, `${this.basePath}${soundId}.mp3`];
    howl = new Howl({ src, volume, html5: false });
    this.howls[soundId] = howl;
    return howl;
  }

  /** Preload one or more sounds so they play without delay on first trigger. */
  preload(...soundIds: (SoundId | string)[]): void {
    soundIds.forEach((id) => this.getOrCreate(id));
  }

  /** Set global SFX volume (0–1) for future play()/getOrCreate() calls. */
  setDefaultVolume(volume: number): void {
    defaultVolume = Math.max(0, Math.min(1, volume));
  }
}
