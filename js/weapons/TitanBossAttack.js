// Titan (final boss) attacks: Monster Hunter–style drawn-out fight with long telegraphs.
// Five attack types: Sweep, Stomp, Crush, Roar, Double Swipe.
class TitanBossAttack {
    constructor() {
        const types = GameConfig.enemy.types.titanBoss;
        const sweep = (types && types.sweep) || {};
        const stomp = (types && types.stomp) || {};
        const crush = (types && types.crush) || {};
        const roar = (types && types.roar) || {};
        const doubleSwipe = (types && types.doubleSwipe) || {};
        this.sweep = {
            chargeTime: sweep.chargeTime ?? 2.2,
            releaseDuration: sweep.releaseDuration ?? 0.35,
            range: sweep.range ?? 220,
            arc: Utils.degToRad(sweep.arcDegrees ?? 120),
            damage: sweep.damage ?? 45,
            knockbackForce: sweep.knockbackForce ?? 400
        };
        this.stomp = {
            chargeTime: stomp.chargeTime ?? 1.8,
            releaseDuration: stomp.releaseDuration ?? 0.25,
            radius: stomp.radius ?? 180,
            damage: stomp.damage ?? 40,
            knockbackForce: stomp.knockbackForce ?? 380
        };
        this.crush = {
            chargeTime: crush.chargeTime ?? 2.5,
            releaseDuration: crush.releaseDuration ?? 0.3,
            range: crush.range ?? 200,
            arc: Utils.degToRad(crush.arcDegrees ?? 80),
            damage: crush.damage ?? 55,
            knockbackForce: crush.knockbackForce ?? 450
        };
        this.roar = {
            chargeTime: roar.chargeTime ?? 2.0,
            releaseDuration: roar.releaseDuration ?? 0.4,
            radius: roar.radius ?? 200,
            damage: roar.damage ?? 15,
            knockbackForce: roar.knockbackForce ?? 200,
            stunBuildup: roar.stunBuildup ?? 60
        };
        this.doubleSwipe = {
            chargeTime1: doubleSwipe.chargeTime1 ?? 0.7,
            release1: doubleSwipe.release1 ?? 0.2,
            chargeTime2: doubleSwipe.chargeTime2 ?? 0.5,
            release2: doubleSwipe.release2 ?? 0.2,
            range: doubleSwipe.range ?? 180,
            arc: Utils.degToRad(doubleSwipe.arcDegrees ?? 100),
            damagePerSwipe: doubleSwipe.damagePerSwipe ?? 25,
            knockbackForce: doubleSwipe.knockbackForce ?? 320
        };
        this.attackCooldown = (types && types.attackCooldown != null) ? types.attackCooldown : 2.5;

        this.hitEnemies = new Set();
        this.attackTimer = 0;
        this.attackBuffer = 0;
        this.attackBufferDuration = 0.4;
        this.currentAttack = null; // 'sweep' | 'stomp' | 'crush' | 'roar' | 'doubleSwipe'
        this.chargeTime = 0;
        this.releaseDuration = 0;
        this.attackDuration = 0;
        this.range = 0;
        this.arc = 0;
        this.damage = 0;
        this.knockbackForce = 0;
        this.isStomp = false;
        this.isRoar = false;
        this.isDoubleSwipe = false;
        this.doubleSwipePhase2ReleaseStart = 0; // time when second swipe release starts
        this.doubleSwipeClearedForPhase2 = false;
    }

    update(deltaTime) {
        if (this.attackTimer > 0) {
            this.attackTimer += deltaTime;
            // Double swipe: clear hitEnemies at start of second release so second swipe can hit
            if (this.isDoubleSwipe && !this.doubleSwipeClearedForPhase2 && this.attackTimer >= this.doubleSwipePhase2ReleaseStart) {
                this.hitEnemies.clear();
                this.doubleSwipeClearedForPhase2 = true;
            }
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

    /** True only during the short window(s) when the attack can hit */
    get isInReleasePhase() {
        if (!this.isAttacking) return false;
        if (this.isDoubleSwipe) {
            const ds = this.doubleSwipe;
            const t = this.attackTimer;
            const release1End = ds.chargeTime1 + ds.release1;
            const phase2Start = ds.chargeTime1 + ds.release1 + ds.chargeTime2;
            const phase2End = phase2Start + ds.release2;
            return (t >= ds.chargeTime1 && t < release1End) || (t >= phase2Start && t < phase2End);
        }
        return this.attackTimer >= this.chargeTime && this.attackTimer < this.attackDuration;
    }

    /** 0–1 during charge phase (for visuals); for double swipe, average of both phases */
    get chargeProgress() {
        if (this.attackTimer <= 0) return 0;
        if (this.isDoubleSwipe) {
            const ds = this.doubleSwipe;
            const t = this.attackTimer;
            const release1End = ds.chargeTime1 + ds.release1;
            const phase2Start = release1End + ds.chargeTime2;
            if (t < ds.chargeTime1) return t / ds.chargeTime1;
            if (t < release1End) return 1;
            if (t < phase2Start) return (t - release1End) / ds.chargeTime2;
            return 1;
        }
        if (this.attackTimer >= this.chargeTime) return 0;
        return this.attackTimer / this.chargeTime;
    }

    get isCircularAttack() {
        return this.isStomp || this.isRoar;
    }

    get stompRadius() {
        if (this.isStomp) return this.stomp.radius || 180;
        if (this.isRoar) return this.roar.radius || 200;
        return 0;
    }

    /** Extra stun buildup for roar (EnemyManager applies this on hit). */
    get roarStunBuildup() {
        return this.isRoar ? (this.roar.stunBuildup || 60) : 0;
    }

    startAttack(targetX, targetY, entity) {
        if (!this.canAttack()) return false;

        const attacks = ['sweep', 'stomp', 'crush', 'roar', 'doubleSwipe'];
        this.currentAttack = attacks[Utils.randomInt(0, attacks.length - 1)];

        this.isStomp = false;
        this.isRoar = false;
        this.isDoubleSwipe = false;
        this.doubleSwipeClearedForPhase2 = false;

        if (this.currentAttack === 'sweep') {
            this.chargeTime = this.sweep.chargeTime;
            this.releaseDuration = this.sweep.releaseDuration;
            this.attackDuration = this.chargeTime + this.releaseDuration;
            this.range = this.sweep.range;
            this.arc = this.sweep.arc;
            this.damage = this.sweep.damage;
            this.knockbackForce = this.sweep.knockbackForce;
        } else if (this.currentAttack === 'stomp') {
            this.chargeTime = this.stomp.chargeTime;
            this.releaseDuration = this.stomp.releaseDuration;
            this.attackDuration = this.chargeTime + this.releaseDuration;
            this.range = this.stomp.radius;
            this.arc = Utils.degToRad(360);
            this.damage = this.stomp.damage;
            this.knockbackForce = this.stomp.knockbackForce;
            this.isStomp = true;
        } else if (this.currentAttack === 'crush') {
            this.chargeTime = this.crush.chargeTime;
            this.releaseDuration = this.crush.releaseDuration;
            this.attackDuration = this.chargeTime + this.releaseDuration;
            this.range = this.crush.range;
            this.arc = this.crush.arc;
            this.damage = this.crush.damage;
            this.knockbackForce = this.crush.knockbackForce;
        } else if (this.currentAttack === 'roar') {
            this.chargeTime = this.roar.chargeTime;
            this.releaseDuration = this.roar.releaseDuration;
            this.attackDuration = this.chargeTime + this.releaseDuration;
            this.range = this.roar.radius;
            this.arc = Utils.degToRad(360);
            this.damage = this.roar.damage;
            this.knockbackForce = this.roar.knockbackForce;
            this.isRoar = true;
        } else {
            // doubleSwipe
            const ds = this.doubleSwipe;
            this.attackDuration = ds.chargeTime1 + ds.release1 + ds.chargeTime2 + ds.release2;
            this.doubleSwipePhase2ReleaseStart = ds.chargeTime1 + ds.release1 + ds.chargeTime2;
            this.chargeTime = ds.chargeTime1;
            this.releaseDuration = ds.release1;
            this.range = ds.range;
            this.arc = ds.arc;
            this.damage = ds.damagePerSwipe;
            this.knockbackForce = ds.knockbackForce;
            this.isDoubleSwipe = true;
        }

        this.hitEnemies.clear();
        this.attackTimer = 0.001;
        this.attackBuffer = this.attackCooldown;

        return {
            range: this.range,
            damage: this.damage,
            arc: this.arc,
            duration: this.attackDuration * 1000,
            stageName: this.currentAttack,
            animationKey: this.currentAttack,
            isCircular: this.isStomp || this.isRoar,
            knockbackForce: this.knockbackForce
        };
    }

    endAttack() {
        if (this.attackTimer <= 0) return;
        this.attackTimer = 0;
        this.attackBuffer = this.attackBufferDuration;
        this.hitEnemies.clear();
        this.currentAttack = null;
        this.isDoubleSwipe = false;
        this.doubleSwipeClearedForPhase2 = false;
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
