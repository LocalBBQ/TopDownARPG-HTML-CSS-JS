(function () {
    const config = {
        maxHealth: 50,
        speed: 20,
        attackRange: 50,
        attackDamage: 8,
        attackArcDegrees: 90,
        color: '#cccccc',
        attackCooldown: 1.5,
        windUpTime: 0.7,
        stunBuildupPerHit: 15,
        knockbackResist: 0,
        knockback: {
            force: 190,
            decay: 0.87
        },
        projectile: {
            enabled: true,
            speed: 200,
            damage: 6,
            range: 280,
            cooldown: 3.5,
            stunBuildup: 15
        },
        packModifier: 'savage'
    };

    function createAttack(attackRange, attackDamage, attackArc, cooldown, windUpTime) {
        return new SkeletonAttack(attackRange, attackDamage, attackArc, cooldown, windUpTime);
    }

    window.EnemySkeleton = EnemyType.fromConfig(config, createAttack);
})();
