(function () {
    const config = {
        maxHealth: 30,
        speed: 25,
        attackRange: 40,
        attackDamage: 5,
        attackArcDegrees: 90,
        detectionRange: 200,
        color: '#44aa44',
        attackCooldown: 1.0,
        windUpTime: 0.6,
        stunThreshold: 60,
        stunBuildupPerHit: 18,
        knockbackResist: 0,
        knockback: {
            force: 160,
            decay: 0.88
        },
        lunge: {
            enabled: true,
            chargeRange: 150,
            chargeTime: 0.8,
            lungeSpeed: 200,
            lungeDistance: 120,
            lungeDamage: 8,
            hitRadiusBonus: 0,
            knockback: { force: 240 },
            hopBackChance: 0.5,
            hopBackDelay: 0.75,
            hopBackDistance: 60,
            hopBackSpeed: 140
        },
        packModifier: 'furious'
    };

    function createAttack(attackRange, attackDamage, attackArc, cooldown, windUpTime) {
        return new GoblinAttack(attackRange, attackDamage, attackArc, cooldown, windUpTime);
    }

    window.EnemyGoblin = EnemyType.fromConfig(config, createAttack);
})();
