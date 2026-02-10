// Crossbow: ranged, no melee combo
(function () {
    const config = {
        name: 'crossbow',
        twoHanded: true,
        baseRange: 600,
        baseDamage: 22,
        baseArcDegrees: 0,
        cooldown: 0,
        comboWindow: 0,
        stages: []
    };
    window.CrossbowWeaponInstance = Crossbow.fromConfig(config);
})();
