// Goblin Chieftain heavy smash: charge up (telegraph), then one heavy hit in a cone
class ChieftainAttack {
    constructor() {
        const config = GameConfig.enemy.types.goblinChieftain && GameConfig.enemy.types.goblinChieftain.heavySmash;
        this.chargeTime = (config && config.chargeTime) || 0.85;
        this.releaseDuration = (config && config.releaseDuration) || 0.15;
        this.range = (config && config.range) || 115;
        this.damage = (config && config.damage) || 16;
        this.arc = Utils.degToRad((config && config.arcDegrees) || 90);
        this.knockbackForce = (config && config.knockbackForce) || 280;

        this.hitEnemies = new Set();
        this.attackTimer = 0;
        this.attackBuffer = 0;
        this.attackBufferDuration = 0.2;
        this.attackDuration = this.chargeTime + this.releaseDuration;
    }

    update(deltaTime) {
        if (this.attackTimer > 0) {
            this.attackTimer += deltaTime;
            if (this.attackTimer >= this.attackDuration) {
                this.endAttack();
            }
        }
        if (this.attackBuffer > 0) {
            this.attackBuffer = Math.max(0, this.attackBuffer - deltaTime);
        }
    }

    canAttack() {
        return !this.isAttacking && this.attackBuffer <= 0;
    }

    /** True only during the short window when the smash can hit */
    get isInReleasePhase() {
        return this.attackTimer >= this.chargeTime && this.attackTimer < this.attackDuration;
    }

    /** 0–1 during charge phase (for visuals) */
    get chargeProgress() {
        if (this.attackTimer <= 0 || this.attackTimer >= this.chargeTime) return 0;
        return this.attackTimer / this.chargeTime;
    }

    startAttack(targetX, targetY, entity) {
        if (!this.canAttack()) return false;

        const config = GameConfig.enemy.types.goblinChieftain && GameConfig.enemy.types.goblinChieftain.heavySmash;
        if (config) {
            this.chargeTime = config.chargeTime || 0.85;
            this.releaseDuration = config.releaseDuration || 0.15;
            this.range = config.range || 115;
            this.damage = config.damage || 16;
            this.arc = Utils.degToRad(config.arcDegrees || 90);
            this.knockbackForce = config.knockbackForce || 280;
        }
        this.attackDuration = this.chargeTime + this.releaseDuration;
        this.hitEnemies.clear();
        this.attackTimer = 0.001;
        this.attackBuffer = this.attackBufferDuration;

        return {
            range: this.range,
            damage: this.damage,
            arc: this.arc,
            duration: this.attackDuration * 1000,
            stageName: 'heavySmash',
            animationKey: 'heavySmash',
            isCircular: false,
            knockbackForce: this.knockbackForce
        };
    }

    endAttack() {
        if (this.attackTimer <= 0) return;
        this.attackTimer = 0;
        this.attackBuffer = this.attackBufferDuration;
        this.hitEnemies.clear();
    }

    hasHitEnemy(enemyId) {
        return this.hitEnemies.has(enemyId);
    }

    markEnemyHit(enemyId) {
        this.hitEnemies.add(enemyId);
    }

    get isAttacking() {
        return this.attackTimer > 0 && this.attackTimer < this.attackDuration;
    }
}
