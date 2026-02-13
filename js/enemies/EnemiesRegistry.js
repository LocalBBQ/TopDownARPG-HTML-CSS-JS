// Registry of enemy types (built from enemy class files). Populates GameConfig.enemy.types at load.
var Enemies = {
    goblin: window.EnemyGoblin,
    skeleton: window.EnemySkeleton,
    lesserDemon: window.EnemyLesserDemon,
    greaterDemon: window.EnemyGreaterDemon,
    goblinChieftain: window.EnemyGoblinChieftain
};

Enemies.getConfig = function (type) {
    const def = this[type];
    return def && def.config ? def.config : null;
};

Enemies.getAttackFactory = function (type) {
    const def = this[type];
    return def && typeof def.createAttack === 'function' ? def.createAttack : null;
};

// Populate GameConfig.enemy.types so existing callers keep working without change
(function () {
    if (typeof GameConfig === 'undefined' || !GameConfig.enemy) return;
    if (!GameConfig.enemy.types) GameConfig.enemy.types = {};
    for (const key of Object.keys(Enemies)) {
        if (Enemies[key] && Enemies[key].config) {
            GameConfig.enemy.types[key] = Enemies[key].config;
        }
    }
})();
