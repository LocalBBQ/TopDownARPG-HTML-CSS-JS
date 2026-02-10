// Sword and Shield: one-handed with block and shield bash
(function () {
    const config = {
        name: 'swordAndShield',
        baseRange: 80,
        baseDamage: 15,
        baseArcDegrees: 60,
        cooldown: 0.3,
        comboWindow: 1.35,
        baseStunBuildup: 25,
        block: {
            enabled: true,
            arcDegrees: 180,
            damageReduction: 1.0,
            staminaCost: 5,
            animationKey: 'block',
            shieldBash: {
                knockback: 1500,
                dashSpeed: 380,
                dashDuration: 0.22,
                staminaCost: 14,
                range: 100,
                arcDegrees: 120
            }
        },
        stages: [
            { name: 'slash', arcDegrees: 90, duration: 280, staminaCost: 10, rangeMultiplier: 1.0, damageMultiplier: 1.2, animationKey: 'melee', knockbackForce: 100, stunBuildup: 28 },
            { name: 'stab', arcDegrees: 24, duration: 300, staminaCost: 12, rangeMultiplier: 1.2, damageMultiplier: 1.0, animationKey: 'melee2', dashSpeed: 60, dashDuration: 0.06, stunBuildup: 22 },
            { name: 'slash', arcDegrees: 90, duration: 280, staminaCost: 10, rangeMultiplier: 1.0, damageMultiplier: 1.2, animationKey: 'melee', knockbackForce: 100, stunBuildup: 28 }
        ],
        specialAttack: { name: 'spin', arcDegrees: 360, duration: 520, staminaCost: 25, rangeMultiplier: 0.9, damageMultiplier: 1.5, animationKey: 'meleeSpin', dashSpeed: 350, dashDuration: 0.5, stunBuildup: 50 }
    };
    window.SwordAndShieldWeapon = Weapon.fromConfig(config);
})();
