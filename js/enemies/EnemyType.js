// Minimal helper for enemy type definitions (config + createAttack) used by EnemiesRegistry
function EnemyType(config, createAttack) {
    return { config, createAttack };
}

EnemyType.fromConfig = function (config, createAttack) {
    return { config, createAttack };
};

if (typeof window !== 'undefined') {
    window.EnemyType = EnemyType;
}
