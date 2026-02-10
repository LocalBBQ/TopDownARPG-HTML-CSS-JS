// Greatsword: two-handed, no block
(function () {
    const config = {
        name: 'greatsword',
        twoHanded: true,
        baseRange: 100,
        baseDamage: 20,
        baseArcDegrees: 100,
        cooldown: 0.55,
        comboWindow: 1.6,
        baseStunBuildup: 35,
        stages: [
            { name: 'slash1', arcDegrees: 180, duration: 480, staminaCost: 18, rangeMultiplier: 1.0, damageMultiplier: 1.0, animationKey: 'melee', stunBuildup: 35 },
            { name: 'slash2', arcDegrees: 110, duration: 540, staminaCost: 20, rangeMultiplier: 1.05, damageMultiplier: 1.5, animationKey: 'melee2', stunBuildup: 42 },
            { name: 'slash3', arcDegrees: 360, duration: 1000, staminaCost: 26, rangeMultiplier: 1.2, damageMultiplier: 1.9, animationKey: 'meleeSpin', stunBuildup: 55 }
        ]
    };
    window.GreatswordWeaponInstance = Greatsword.fromConfig(config);
})();
