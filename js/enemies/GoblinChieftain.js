(function () {
    const config = {
        maxHealth: 60,
        speed: 20,
        attackRange: 115,
        attackDamage: 16,
        attackArcDegrees: 90,
        detectionRange: 220,
        color: '#2d5a2d',
        attackCooldown: 1.2,
        windUpTime: 0.5,
        stunThreshold: 70,
        stunBuildupPerHit: 24,
        knockbackResist: 0.5,
        knockback: {
            force: 200,
            decay: 0.86
        },
        heavySmash: {
            chargeTime: 0.85,
            releaseDuration: 0.15,
            damage: 16,
            range: 115,
            arcDegrees: 90,
            knockbackForce: 280
        },
        warCry: {
            enabled: true,
            radius: 180,
            cooldown: 12.0,
            buffDuration: 5.0,
            speedMultiplier: 1.2,
            damageMultiplier: 1.2
        },
        packModifier: 'inspiring'
    };

    function createAttack() {
        return new ChieftainAttack();
    }

    window.EnemyGoblinChieftain = EnemyType.fromConfig(config, createAttack);
})();
