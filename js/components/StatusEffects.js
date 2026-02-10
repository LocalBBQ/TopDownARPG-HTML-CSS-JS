// Status effects (stun, etc.) - shared by player and enemies
// Stun is a meter: attacks add buildup; when buildup >= threshold, entity is stunned and meter resets.
class StatusEffects {
    constructor(isPlayer = false) {
        this.entity = null;
        this.isPlayer = isPlayer;
        // Stun: end time in seconds (performance.now()/1000)
        this.stunnedUntil = 0;
        // Total duration of current stun (seconds), for UI bar
        this.stunDurationTotal = 0;
        // Stun meter (buildup toward threshold)
        this.stunBuildup = 0;
        // Last time (seconds) we received stun buildup — used for player decay cooldown
        this.lastStunBuildupTime = 0;
    }

    get isStunned() {
        const now = performance.now() / 1000;
        if (now >= this.stunnedUntil) return false;
        return true;
    }

    /** Stun meter fill (0–1) for UI. */
    get stunMeterPercent() {
        const threshold = this._getStunThreshold();
        return threshold <= 0 ? 0 : Math.min(1, this.stunBuildup / threshold);
    }

    _getStunThreshold() {
        if (this.isPlayer) {
            const cfg = GameConfig.player.stun || {};
            return cfg.threshold ?? 100;
        }
        const cfg = GameConfig.statusEffects || {};
        return cfg.enemyStunThreshold ?? 100;
    }

    _getStunDuration() {
        if (this.isPlayer) {
            const cfg = GameConfig.player.stun || {};
            return cfg.duration ?? 1;
        }
        const cfg = GameConfig.statusEffects || {};
        return cfg.enemyStunDuration ?? 1;
    }

    _getStunDecayPerSecond() {
        if (this.isPlayer) {
            const cfg = GameConfig.player.stun || {};
            return cfg.decayPerSecond ?? 0;
        }
        const cfg = GameConfig.statusEffects || {};
        return cfg.enemyStunDecayPerSecond ?? 0;
    }

    /** Seconds after last buildup before decay starts (player only). */
    _getStunDecayCooldown() {
        if (!this.isPlayer) return 0;
        const cfg = GameConfig.player.stun || {};
        return cfg.decayCooldown ?? 0;
    }

    /** Apply stun for the given duration (seconds). */
    applyStun(duration) {
        const now = performance.now() / 1000;
        const end = now + duration;
        if (end > this.stunnedUntil) {
            this.stunnedUntil = end;
            this.stunDurationTotal = end - now;
        }
    }

    /** Fraction of stun duration remaining (0–1) for UI bar; 0 when not stunned. */
    get stunDurationPercentRemaining() {
        const now = performance.now() / 1000;
        if (now >= this.stunnedUntil || this.stunDurationTotal <= 0) return 0;
        return Math.min(1, (this.stunnedUntil - now) / this.stunDurationTotal);
    }

    /**
     * Add stun buildup. When buildup >= threshold, applies stun and resets meter.
     * @param {number} amount - stun buildup to add (from attacks/weapons)
     */
    addStunBuildup(amount) {
        if (amount <= 0) return;
        const threshold = this._getStunThreshold();
        if (threshold <= 0) return;
        this.stunBuildup += amount;
        this.lastStunBuildupTime = performance.now() / 1000;
        if (this.stunBuildup >= threshold) {
            this.applyStun(this._getStunDuration());
            this.stunBuildup = 0;
        }
    }

    update(deltaTime, systems) {
        const now = performance.now() / 1000;
        if (now < this.stunnedUntil) return; // no decay while stunned
        const decay = this._getStunDecayPerSecond();
        if (decay <= 0 || this.stunBuildup <= 0) return;
        // Player: wait for decay cooldown after last stun buildup before decaying
        if (this.isPlayer) {
            const cooldown = this._getStunDecayCooldown();
            if (cooldown > 0 && now - this.lastStunBuildupTime < cooldown) return;
        }
        this.stunBuildup = Math.max(0, this.stunBuildup - decay * deltaTime);
    }
}
