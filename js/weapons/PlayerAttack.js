// Player-specific attack handler with weapon support
class PlayerAttack {
    constructor(weapon) {
        this.weapon = weapon || Weapons.swordAndShield;
        this.comboStage = 0;
        this.comboTimer = 0;
        this.comboWindow = (this.weapon.comboWindow ?? 1.5); // seconds, from weapon config
        this.hitEnemies = new Set();
        this.attackTimer = 0;
        this.attackDuration = 0;
        this.attackBuffer = 0;
        this.attackBufferDuration = 0; // no delay after attack completes — can chain next attack immediately
    }
    
    setWeapon(weapon) {
        this.weapon = weapon;
        this.comboWindow = weapon.comboWindow ?? 1.5;
        this.resetCombo();
    }
    
    update(deltaTime, entity = null) {
        // Update attack timer for visual effects
        if (this.attackTimer > 0) {
            this.attackTimer += deltaTime;
        }
        
        // Update attack buffer
        if (this.attackBuffer > 0) {
            this.attackBuffer = Math.max(0, this.attackBuffer - deltaTime);
        }
        
        // Update combo timer
        if (this.comboStage > 0 && this.attackTimer <= 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                this.resetCombo();
            }
        }
    }
    
    canAttack() {
        return this.attackBuffer <= 0;
    }

    /** Returns stamina cost for the next attack without advancing state (for pre-check and buffered attacks). */
    getNextAttackStaminaCost(chargeDuration = 0, options = {}) {
        const useDashAttack = options.useDashAttack && this.weapon.dashAttack;
        const chargedAttackConfig = this.weapon.chargeAttack || null;
        let stageProps;
        if (useDashAttack) {
            stageProps = this.weapon.getDashAttackProperties();
        } else {
            const isCharged = chargedAttackConfig && chargeDuration >= chargedAttackConfig.minChargeTime;
            let nextStage = isCharged ? 1 : (this.comboStage < this.weapon.maxComboStage ? this.comboStage + 1 : 1);
            stageProps = this.weapon.getComboStageProperties(nextStage);
            // Charged thrust (weapon with thrust stage): use thrust stage for cost
            if (isCharged && chargedAttackConfig.chargedThrustDashSpeed != null) {
                const stabProps = this.weapon.getComboStageProperties(3);
                if (stabProps) stageProps = stabProps;
            }
        }
        if (!stageProps) return 0;
        let cost = stageProps.staminaCost;
        if (!useDashAttack && chargedAttackConfig && chargeDuration >= chargedAttackConfig.minChargeTime) {
            const chargeMultiplier = Math.min(1.0, (chargeDuration - chargedAttackConfig.minChargeTime) /
                (chargedAttackConfig.maxChargeTime - chargedAttackConfig.minChargeTime));
            cost *= (1.0 + (chargedAttackConfig.staminaCostMultiplier - 1.0) * chargeMultiplier);
        }
        return cost;
    }

    startAttack(targetX, targetY, entity, chargeDuration = 0, options = {}) {
        if (!this.canAttack()) {
            return false;
        }

        const useDashAttack = options.useDashAttack && this.weapon.dashAttack;
        const chargedAttackConfig = this.weapon.chargeAttack || null;
        let stageProps;
        let isCharged = false;
        let chargeMultiplier = 0;

        if (useDashAttack) {
            stageProps = this.weapon.getDashAttackProperties();
            if (!stageProps) return false;
        } else {
            isCharged = chargedAttackConfig && chargeDuration >= chargedAttackConfig.minChargeTime;
            if (isCharged) {
                chargeMultiplier = Math.min(1.0, (chargeDuration - chargedAttackConfig.minChargeTime) /
                    (chargedAttackConfig.maxChargeTime - chargedAttackConfig.minChargeTime));
            }
            if (isCharged) {
                this.comboStage = 1;
            } else {
                if (this.comboStage < this.weapon.maxComboStage) {
                    this.comboStage++;
                } else {
                    this.comboStage = 1;
                }
            }
            stageProps = this.weapon.getComboStageProperties(this.comboStage);
            if (!stageProps) return false;

            // Charged thrust: use thrust stage (e.g. stab) when weapon has chargedThrustDashSpeed
            const isChargedThrust = isCharged && chargedAttackConfig && chargedAttackConfig.chargedThrustDashSpeed != null;
            if (isChargedThrust) {
                const stabProps = this.weapon.getComboStageProperties(3);
                if (stabProps) stageProps = stabProps;
            }
        }

        // Reset combo window (for both normal and dash attack)
        this.comboTimer = this.comboWindow;
        this.hitEnemies.clear();

        let finalDamage = stageProps.damage;
        let finalRange = stageProps.range;
        let finalStaminaCost = stageProps.staminaCost;
        if (!useDashAttack && isCharged && chargedAttackConfig && chargeMultiplier > 0) {
            const damageMultiplier = 1.0 + (chargedAttackConfig.damageMultiplier - 1.0) * chargeMultiplier;
            const rangeMultiplier = 1.0 + (chargedAttackConfig.rangeMultiplier - 1.0) * chargeMultiplier;
            const staminaMultiplier = 1.0 + (chargedAttackConfig.staminaCostMultiplier - 1.0) * chargeMultiplier;
            finalDamage = stageProps.damage * damageMultiplier;
            finalRange = stageProps.range * rangeMultiplier;
            finalStaminaCost = stageProps.staminaCost * staminaMultiplier;
        }

        // Charged thrust dash: distance scales with charge (when weapon defines chargedThrustDashSpeed)
        let dashSpeed = stageProps.dashSpeed;
        let dashDuration = stageProps.dashDuration;
        const isChargedThrust = !useDashAttack && isCharged && chargedAttackConfig && chargedAttackConfig.chargedThrustDashSpeed != null;
        if (isChargedThrust) {
            const minDist = chargedAttackConfig.chargedThrustDashDistanceMin ?? 25;
            const maxDist = chargedAttackConfig.chargedThrustDashDistanceMax ?? 140;
            const dashDistance = minDist + (maxDist - minDist) * chargeMultiplier;
            dashSpeed = chargedAttackConfig.chargedThrustDashSpeed;
            dashDuration = dashDistance / dashSpeed;
        }
        
        // Set attack duration
        this.attackDuration = stageProps.duration / 1000; // Convert to seconds
        this.attackTimer = 0.001; // Start timer (small value to indicate active)
        
        // Handle dash: start immediately for all attacks (spin uses speed ramp in PlayerMovement so first frame is smooth)
        if (dashSpeed && entity) {
            const transform = entity.getComponent(Transform);
            if (transform && targetX !== null && targetY !== null) {
                const dx = targetX - transform.x;
                const dy = targetY - transform.y;
                const normalized = Utils.normalize(dx, dy);
                const movement = entity.getComponent(Movement);
                if (movement && movement.startAttackDash) {
                    movement.startAttackDash(normalized.x, normalized.y, dashDuration, dashSpeed);
                }
            }
        }
        
        return {
            range: finalRange,
            damage: finalDamage,
            arc: stageProps.arc,
            arcOffset: stageProps.arcOffset ?? 0,
            reverseSweep: stageProps.reverseSweep === true,
            comboStage: this.comboStage,
            staminaCost: finalStaminaCost,
            duration: stageProps.duration,
            stageName: stageProps.stageName,
            animationKey: stageProps.animationKey,
            isCircular: stageProps.isCircular,
            isThrust: stageProps.isThrust === true,
            thrustWidth: stageProps.thrustWidth ?? 40,
            knockbackForce: stageProps.knockbackForce,
            stunBuildup: stageProps.stunBuildup ?? 25,
            isCharged: isCharged,
            chargeMultiplier: chargeMultiplier,
            isDashAttack: useDashAttack
        };
    }
    
    endAttack() {
        this.attackTimer = 0;
        this.attackBuffer = this.attackBufferDuration;
        this.hitEnemies.clear();
    }
    
    resetCombo() {
        this.comboStage = 0;
        this.comboTimer = 0;
        this.hitEnemies.clear();
    }
    
    hasHitEnemy(enemyId) {
        return this.hitEnemies.has(enemyId);
    }
    
    markEnemyHit(enemyId) {
        this.hitEnemies.add(enemyId);
    }
    
    get isAttacking() {
        // Must stay true until endAttack() runs (setTimeout callback). If we used
        // "attackTimer < attackDuration", the update loop would set isAttacking false
        // a frame or more before the callback runs, allowing a new attack to start and chain.
        return this.attackTimer > 0;
    }

    /** True when the active hitbox/release phase is in progress (for visuals/hit detection). */
    get isAttackActive() {
        return this.attackTimer > 0 && this.attackTimer < this.attackDuration;
    }
}

