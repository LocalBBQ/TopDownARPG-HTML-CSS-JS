// Base weapon class - defines weapon types and their combos
class Weapon {
    constructor(name, baseRange, baseDamage, baseArcDegrees, cooldown, comboConfig, comboWindow = 1.5, knockback = null, block = null, twoHanded = false, specialAttack = null) {
        this.name = name;
        this.baseRange = baseRange;
        this.baseDamage = baseDamage;
        this.baseArcDegrees = baseArcDegrees;
        this.cooldown = cooldown;
        this.comboConfig = comboConfig; // Array of combo stage configs
        this.comboWindow = comboWindow;
        this.knockback = knockback; // Optional { force } for weapon-level default
        this.block = block; // Optional block config: { enabled, arcRad, damageReduction, staminaCost, animationKey }
        this.twoHanded = twoHanded === true;
        this.specialAttack = specialAttack || null; // Optional single attack (e.g. shift+click 360)
    }

    static fromConfig(config) {
        const stages = config.stages || [];
        let block = null;
        if (config.block != null && config.block.enabled !== false) {
            const arcDegrees = config.block.arcDegrees ?? 180;
            block = {
                enabled: config.block.enabled !== false,
                arcRad: typeof Utils !== 'undefined' ? Utils.degToRad(arcDegrees) : (arcDegrees * Math.PI / 180),
                damageReduction: config.block.damageReduction ?? 1.0,
                staminaCost: config.block.staminaCost ?? 5,
                animationKey: config.block.animationKey ?? 'block'
            };
            if (config.block.shieldBash) {
                const sb = config.block.shieldBash;
                block.shieldBash = {
                    knockback: sb.knockback ?? 500,
                    dashSpeed: sb.dashSpeed ?? 380,
                    dashDuration: sb.dashDuration ?? 0.22,
                    staminaCost: sb.staminaCost ?? 14,
                    range: sb.range ?? 100,
                    arcRad: typeof Utils !== 'undefined' ? Utils.degToRad(sb.arcDegrees ?? 120) : ((sb.arcDegrees ?? 120) * Math.PI / 180)
                };
            }
        }
        return new Weapon(
            config.name || 'weapon',
            config.baseRange ?? 100,
            config.baseDamage ?? 15,
            config.baseArcDegrees ?? 60,
            config.cooldown ?? 0.3,
            stages,
            config.comboWindow ?? 1.5,
            config.knockback ?? null,
            block,
            config.twoHanded === true,
            config.specialAttack ?? null
        );
    }

    // Returns block config for Combat: { enabled, arcRad, damageReduction, staminaCost, animationKey } or null
    getBlockConfig() {
        return this.block;
    }
    
    // Get combo stage properties (returns arc in radians for runtime)
    getComboStageProperties(stage) {
        if (stage < 1 || stage > this.comboConfig.length) {
            return null;
        }
        
        const stageConfig = this.comboConfig[stage - 1];
        const arcDegrees = stageConfig.arcDegrees != null
            ? stageConfig.arcDegrees
            : (stageConfig.arc != null ? stageConfig.arc * 180 / Math.PI : this.baseArcDegrees);
        const arcRad = stageConfig.arcDegrees != null
            ? Utils.degToRad(stageConfig.arcDegrees)
            : (stageConfig.arc != null ? stageConfig.arc : Utils.degToRad(this.baseArcDegrees));
        const isCircular = arcDegrees >= 360;
        // Knockback: stage override → weapon default → null (caller uses player.knockback.force)
        const knockbackForce = stageConfig.knockbackForce ?? stageConfig.knockback?.force ?? this.knockback?.force ?? null;
        const stunBuildup = stageConfig.stunBuildup != null ? stageConfig.stunBuildup : 25;
        return {
            range: this.baseRange * (stageConfig.rangeMultiplier || 1.0),
            damage: this.baseDamage * (stageConfig.damageMultiplier || 1.0),
            arc: arcRad,
            duration: stageConfig.duration || 100, // ms
            staminaCost: stageConfig.staminaCost || 10,
            dashSpeed: stageConfig.dashSpeed || null,
            dashDuration: stageConfig.dashDuration || 0,
            stageName: stageConfig.name || `stage${stage}`,
            animationKey: stageConfig.animationKey || 'melee',
            isCircular,
            knockbackForce,
            stunBuildup
        };
    }
    
    get maxComboStage() {
        return this.comboConfig.length;
    }

    // Get special attack properties (e.g. shift+click 360) — same shape as getComboStageProperties
    getSpecialAttackProperties() {
        const stageConfig = this.specialAttack;
        if (!stageConfig) return null;
        const arcDegrees = stageConfig.arcDegrees != null
            ? stageConfig.arcDegrees
            : (stageConfig.arc != null ? stageConfig.arc * 180 / Math.PI : this.baseArcDegrees);
        const arcRad = stageConfig.arcDegrees != null
            ? Utils.degToRad(stageConfig.arcDegrees)
            : (stageConfig.arc != null ? stageConfig.arc : Utils.degToRad(this.baseArcDegrees));
        const isCircular = arcDegrees >= 360;
        const knockbackForce = stageConfig.knockbackForce ?? stageConfig.knockback?.force ?? this.knockback?.force ?? null;
        const stunBuildup = stageConfig.stunBuildup != null ? stageConfig.stunBuildup : 25;
        return {
            range: this.baseRange * (stageConfig.rangeMultiplier || 1.0),
            damage: this.baseDamage * (stageConfig.damageMultiplier || 1.0),
            arc: arcRad,
            duration: stageConfig.duration || 100,
            staminaCost: stageConfig.staminaCost || 10,
            dashSpeed: stageConfig.dashSpeed || null,
            dashDuration: stageConfig.dashDuration || 0,
            stageName: stageConfig.name || 'special',
            animationKey: stageConfig.animationKey || 'melee',
            isCircular,
            knockbackForce,
            stunBuildup
        };
    }
}

// Crossbow: ranged weapon, one shot then reload; has perfect-reload window
class Crossbow extends Weapon {
    constructor(name, baseRange, baseDamage, baseArcDegrees, cooldown, comboConfig, comboWindow = 0, knockback = null, block = null, twoHanded = true, specialAttack = null) {
        super(name, baseRange, baseDamage, baseArcDegrees, cooldown, comboConfig, comboWindow, knockback, block, twoHanded, specialAttack);
        this.isRanged = true;
    }

    static fromConfig(config) {
        const w = Weapon.fromConfig(config);
        return new Crossbow(w.name, w.baseRange, w.baseDamage, w.baseArcDegrees, w.cooldown, w.comboConfig, w.comboWindow, w.knockback, w.block, w.twoHanded, w.specialAttack);
    }
}

// Greatsword: two-handed weapon with no blocking (different block logic - override in subclass)
class Greatsword extends Weapon {
    constructor(name, baseRange, baseDamage, baseArcDegrees, cooldown, comboConfig, comboWindow = 1.5, knockback = null, block = null, twoHanded = true, specialAttack = null) {
        super(name, baseRange, baseDamage, baseArcDegrees, cooldown, comboConfig, comboWindow, knockback, null, twoHanded, specialAttack);
    }

    getBlockConfig() {
        return null;
    }

    static fromConfig(config) {
        const w = Weapon.fromConfig(config);
        return new Greatsword(w.name, w.baseRange, w.baseDamage, w.baseArcDegrees, w.cooldown, w.comboConfig, w.comboWindow, w.knockback, null, w.twoHanded, w.specialAttack);
    }
}

// Weapons registry is built in WeaponsRegistry.js from SwordAndShield.js, GreatswordWeapon.js, CrossbowWeapon.js
