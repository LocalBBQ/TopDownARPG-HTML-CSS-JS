// Demon-specific attack handler - uses player attack style but at 20% speed
class DemonAttack {
    constructor(weapon) {
        this.weapon = weapon || Weapons.sword; // Default to sword
        this.speedMultiplier = 0.2; // 20% speed (5x slower)
        this.comboStage = 0;
        this.comboTimer = 0;
        this.comboWindow = (this.weapon.comboWindow ?? 1.5) / this.speedMultiplier; // seconds, adjusted for speed
        this.hitEnemies = new Set();
        this.attackTimer = 0;
        this.attackDuration = 0;
        this.attackBuffer = 0;
        this.attackBufferDuration = 0.1; // Small buffer to prevent immediate re-attack
    }
    
    setWeapon(weapon) {
        this.weapon = weapon;
        this.comboWindow = (weapon.comboWindow ?? 1.5) / this.speedMultiplier;
        this.resetCombo();
    }
    
    update(deltaTime) {
        // #region agent log
        if (this.attackTimer > 0) {
            fetch('http://127.0.0.1:7242/ingest/e535072a-96e6-4390-b673-9e50f66af7db',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemonAttack.js:22',message:'DemonAttack update',data:{attackTimer:this.attackTimer,attackDuration:this.attackDuration,deltaTime:deltaTime,willEnd:this.attackTimer + deltaTime >= this.attackDuration},timestamp:Date.now(),runId:'pre-fix',hypothesisId:'E'})}).catch(()=>{});
        }
        // #endregion
        // Update attack timer for visual effects
        if (this.attackTimer > 0) {
            this.attackTimer += deltaTime;
            
            // Check if attack duration has been exceeded and end attack naturally
            if (this.attackTimer >= this.attackDuration) {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/e535072a-96e6-4390-b673-9e50f66af7db',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemonAttack.js:28',message:'Ending attack naturally in update',data:{attackTimer:this.attackTimer,attackDuration:this.attackDuration},timestamp:Date.now(),runId:'pre-fix',hypothesisId:'E'})}).catch(()=>{});
                // #endregion
                this.endAttack();
            }
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
        // Cannot attack if already attacking or buffer is active
        return !this.isAttacking && this.attackBuffer <= 0;
    }
    
    startAttack(targetX, targetY, entity) {
        if (!this.canAttack()) {
            return false;
        }
        
        // Advance combo stage
        if (this.comboStage < this.weapon.maxComboStage) {
            this.comboStage++;
        } else {
            // Reset to first stage after completing full combo
            this.comboStage = 1;
        }
        
        // Reset combo window (adjusted for speed multiplier)
        this.comboTimer = this.comboWindow;
        this.hitEnemies.clear();
        
        // Get combo stage properties
        const stageProps = this.weapon.getComboStageProperties(this.comboStage);
        if (!stageProps) return false;
        
        // Set attack duration (adjusted for speed multiplier - 5x slower)
        this.attackDuration = (stageProps.duration / 1000) / this.speedMultiplier; // Convert to seconds and adjust for speed
        this.attackTimer = 0.001; // Start timer (small value to indicate active)
        // Set attack buffer to prevent immediate re-attack
        this.attackBuffer = this.attackBufferDuration;
        
        // #region agent log
        const returnDuration = stageProps.duration / this.speedMultiplier;
        fetch('http://127.0.0.1:7242/ingest/e535072a-96e6-4390-b673-9e50f66af7db',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemonAttack.js:52',message:'DemonAttack startAttack',data:{stagePropsDuration:stageProps.duration,speedMultiplier:this.speedMultiplier,attackDuration:this.attackDuration,returnDuration:returnDuration,isNaN:isNaN(returnDuration),isFinite:isFinite(returnDuration)},timestamp:Date.now(),runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        
        // Handle dash for stage 3 (or any stage with dashSpeed)
        if (stageProps.dashSpeed && entity) {
            const movement = entity.getComponent(Movement);
            const transform = entity.getComponent(Transform);
            if (movement && transform && targetX !== null && targetY !== null) {
                const dx = targetX - transform.x;
                const dy = targetY - transform.y;
                const normalized = Utils.normalize(dx, dy);
                // Dash duration also adjusted for speed
                const dashDuration = stageProps.dashDuration / this.speedMultiplier;
                movement.startAttackDash(normalized.x, normalized.y, dashDuration);
            }
        }
        
        return {
            range: stageProps.range,
            damage: stageProps.damage,
            arc: stageProps.arc,
            comboStage: this.comboStage,
            duration: stageProps.duration / this.speedMultiplier, // Adjusted duration in ms (5x slower)
            stageName: stageProps.stageName,
            animationKey: stageProps.animationKey,
            isCircular: stageProps.isCircular,
            knockbackForce: stageProps.knockbackForce
        };
    }
    
    endAttack() {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e535072a-96e6-4390-b673-9e50f66af7db',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemonAttack.js:106',message:'DemonAttack endAttack called',data:{attackTimer:this.attackTimer,attackDuration:this.attackDuration},timestamp:Date.now(),runId:'pre-fix',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        // Prevent double-calling if already ended
        if (this.attackTimer <= 0) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/e535072a-96e6-4390-b673-9e50f66af7db',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemonAttack.js:108',message:'endAttack early return (already ended)',data:{},timestamp:Date.now(),runId:'pre-fix',hypothesisId:'F'})}).catch(()=>{});
            // #endregion
            return;
        }
        this.attackTimer = 0;
        this.attackBuffer = this.attackBufferDuration;
        this.hitEnemies.clear();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e535072a-96e6-4390-b673-9e50f66af7db',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DemonAttack.js:113',message:'endAttack completed',data:{attackTimer:this.attackTimer},timestamp:Date.now(),runId:'pre-fix',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
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
        return this.attackTimer > 0 && this.attackTimer < this.attackDuration;
    }
}

