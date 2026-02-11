// Mace: two-handed, big sweeps back and forth, heavy knockback
(function () {
    const config = {
        name: 'mace',
        twoHanded: true,
        baseRange: 95,
        baseDamage: 22,
        baseArcDegrees: 200,
        cooldown: 0.7,
        comboWindow: 2.0,
        knockback: { force: 1200 },
        stages: [
            { name: 'sweep1', arcDegrees: 220, duration: 580, staminaCost: 20, rangeMultiplier: 1.0, damageMultiplier: 1.0, animationKey: 'melee', stunBuildup: 40 },
            { name: 'sweep2', arcDegrees: 220, duration: 620, staminaCost: 22, rangeMultiplier: 1.05, damageMultiplier: 1.3, animationKey: 'melee2', stunBuildup: 45 },
            { name: 'sweep3', arcDegrees: 240, duration: 720, staminaCost: 26, rangeMultiplier: 1.1, damageMultiplier: 1.6, animationKey: 'melee', stunBuildup: 55 }
        ]
    };
    window.MaceWeaponInstance = Greatsword.fromConfig(config);
})();
