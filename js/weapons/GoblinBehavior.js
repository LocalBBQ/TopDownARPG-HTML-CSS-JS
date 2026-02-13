// Legacy: Goblin attack is now EnemyAttackHandler(dagger, 'slashOnly'). This class is unused.
// Goblin behavior: slash only; dagger dash attack reserved for future use.
// Stats (range, damage, arc, cooldown, leap damage) come from the weapon; this class handles timing and state.
class GoblinBehavior {
    constructor(weapon, options = {}) {
        if (!weapon) {
            this.attackRange = options.attackRange ?? 40;
            this.attackDamage = options.attackDamage ?? 5;
            this.attackArc = options.attackArc != null ? options.attackArc : (Math.PI / 2);
            this.maxCooldown = options.maxCooldown ?? 1.0;
            this.windUpTime = options.windUpTime ?? 0.6;
            this._leapDamage = options.leapDamage ?? 8;
            this._leapKnockbackForce = options.leapKnockbackForce ?? 240;
        } else {
            const first = weapon.getComboStageProperties ? weapon.getComboStageProperties(1) : null;
            const dash = weapon.getDashAttackProperties ? weapon.getDashAttackProperties() : null;
            this.attackRange = first ? first.range : (weapon.baseRange ?? 40);
            this.attackDamage = first ? first.damage : (weapon.baseDamage ?? 5);
            this.attackArc = first ? first.arc : (typeof weapon.baseArcDegrees === 'number' ? (weapon.baseArcDegrees * Math.PI / 180) : Math.PI / 2);
            this.maxCooldown = weapon.cooldown != null ? weapon.cooldown : 1.0;
            this.windUpTime = options.windUpTime ?? 0.6;
            this._leapDamage = dash ? dash.damage : 8;
            this._leapKnockbackForce = (dash && dash.knockbackForce) != null ? dash.knockbackForce : 240;
        }

        this.cooldown = 0;
        this.windUpTimer = 0;
        this.isWindingUp = false;
        this.isAttacking = false;
        this.attackProcessed = false;
        this.isLunging = false;
        this.lungeTargetX = 0;
        this.lungeTargetY = 0;
        this.lungeDamage = this._leapDamage;
    }

    update(deltaTime) {
        if (this.cooldown > 0) {
            this.cooldown = Math.max(0, this.cooldown - deltaTime);
        }
        if (this.isWindingUp) {
            this.windUpTimer -= deltaTime;
            if (this.windUpTimer <= 0) {
                this.isWindingUp = false;
                this.isAttacking = true;
                this.attackProcessed = false;
                setTimeout(() => {
                    this.isAttacking = false;
                    this.attackProcessed = false;
                }, 200);
            }
        }
    }

    startLunge(targetX, targetY, lungeConfig) {
        this.isLunging = true;
        this.lungeTargetX = targetX;
        this.lungeTargetY = targetY;
        this.lungeDamage = (lungeConfig && lungeConfig.lungeDamage != null) ? lungeConfig.lungeDamage : this._leapDamage;
        this.isAttacking = true;
        this.attackProcessed = false;
    }

    endLunge(cooldownMultiplier = 1) {
        this.isLunging = false;
        this.isAttacking = false;
        this.attackProcessed = false;
        this.cooldown = this.maxCooldown * (cooldownMultiplier != null ? cooldownMultiplier : 1);
    }

    attack(cooldownMultiplier = 1) {
        if (this.cooldown > 0 || this.isWindingUp || this.isLunging) return false;
        this.isWindingUp = true;
        this.windUpTimer = this.windUpTime;
        this.cooldown = this.maxCooldown * (cooldownMultiplier != null ? cooldownMultiplier : 1);
        return true;
    }

    get windUpProgress() {
        if (!this.isWindingUp) return 0;
        return 1 - (this.windUpTimer / this.windUpTime);
    }
}
