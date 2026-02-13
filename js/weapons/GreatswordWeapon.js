// Greatsword: two-handed, no block
(function () {
    const config = {
        name: 'greatsword',
        twoHanded: true,
        baseRange: 100,
        baseDamage: 20,
        baseArcDegrees: 100,
        cooldown: 0.8,
        comboWindow: 2.0,
        baseStunBuildup: 35,
        weaponLength: 75,
        stages: [
            { name: 'slash1', arcDegrees: 180, duration: 680, staminaCost: 18, range: 100, damageMultiplier: 1.0, animationKey: 'melee', stunBuildup: 35 },
            { name: 'slash2', arcDegrees: 110, duration: 760, staminaCost: 20, range: 105, damageMultiplier: 1.5, animationKey: 'melee2', stunBuildup: 42, reverseSweep: true },
            { name: 'slash3', arcDegrees: 360, duration: 1420, staminaCost: 26, range: 120, damageMultiplier: 1.9, animationKey: 'meleeSpin', stunBuildup: 55 }
        ],
        chargeAttack: {
            minChargeTime: 0.5,
            maxChargeTime: 2.0,
            damageMultiplier: 2.0,
            rangeMultiplier: 3.0,
            staminaCostMultiplier: 1.5
        }
    };
    window.GreatswordWeaponInstance = Greatsword.fromConfig(config);
})();
