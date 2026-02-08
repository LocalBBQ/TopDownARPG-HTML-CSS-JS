// Centralized game configuration
const GameConfig = {
    world: {
        width: 4800,
        height: 2800,
        tileSize: 50
    },

    weapons: {
        sword: {
            name: 'sword',
            baseRange: 80,
            baseDamage: 15,
            baseArcDegrees: 60,
            cooldown: 0.3,
            comboWindow: 1.5,
            stages: [
                { name: 'swipe', arcDegrees: 90, duration: 320, staminaCost: 10, rangeMultiplier: 1.0, damageMultiplier: 1.2, animationKey: 'melee' },
                { name: 'stab', arcDegrees: 24, duration: 350, staminaCost: 12, rangeMultiplier: 1.2, damageMultiplier: 1.0, animationKey: 'melee2', dashSpeed: 500, dashDuration: 0.25 },
                { name: 'spin', arcDegrees: 360, duration: 520, staminaCost: 15, rangeMultiplier: 0.9, damageMultiplier: 1.5, animationKey: 'meleeSpin', dashSpeed: 450, dashDuration: 0.45 }
            ]
        }
    },
    
    player: {
        startX: 2400,
        startY: 1400,
        width: 30,
        height: 30,
        speed: 100, // pixels per second (now properly scaled by deltaTime)
        maxHealth: 100,
        maxStamina: 50,
        staminaRegen: 5, // stamina per second (scaled by deltaTime)
        attackRange: 80,
        attackDamage: 15,
        attackArcDegrees: 60,
        attackCooldown: 0.3, // seconds - faster for combos (was 0.5)
        color: '#4444ff',
        defaultWeapon: 'sword',
        chargedAttack: {
            minChargeTime: 0.5, // Minimum time to charge (seconds)
            maxChargeTime: 2.0, // Maximum charge time (seconds)
            damageMultiplier: 2.0, // Damage multiplier at max charge
            rangeMultiplier: 1.5, // Range multiplier at max charge
            staminaCostMultiplier: 1.5 // Stamina cost multiplier at max charge
        },
        sprint: {
            multiplier: 1.66, // 66% speed increase
            staminaCost: 12 // stamina consumed per second
        },
        dodge: {
            speed: 400, // pixels per second during dodge
            duration: 0.3, // seconds of dodge roll
            cooldown: 1.0, // seconds between dodges
            staminaCost: 15 // stamina cost to dodge
        },
        knockback: {
            force: 550, // Knockback force for player attacks (pixels per second initial velocity)
            decay: 0.85, // Friction factor (higher = less friction, more distance)
            receivedMultiplier: 3.0 // Multiplier applied to knockback received from enemies
        },
        projectile: {
            speed: 400, // Pixels per second
            damage: 10, // Base damage
            range: 500, // Maximum travel distance
            cooldown: 0.5, // Seconds between shots
            staminaCost: 8 // Stamina cost per shot
        }
    },
    
    enemy: {
        types: {
            goblin: {
                maxHealth: 30,
                speed: 25, // pixels per second (now properly scaled by deltaTime) - slowed down
                attackRange: 40,
                attackDamage: 5,
                attackArcDegrees: 90,
                detectionRange: 200,
                color: '#44aa44',
                attackCooldown: 1.0, // seconds (was 60 frames at 60fps)
                windUpTime: 0.6, // seconds before attack hits
                knockback: {
                    force: 160, // Knockback force when goblin hits player (increased by 10)
                    decay: 0.88 // Friction factor
                },
                lunge: {
                    enabled: true,
                    chargeRange: 150, // Distance at which goblin starts charging lunge
                    chargeTime: 0.8, // Time to charge up the lunge
                    lungeSpeed: 200, // Speed during lunge - slowed down
                    lungeDistance: 120, // Maximum distance to lunge
                    lungeDamage: 8, // Damage dealt by lunge (higher than normal attack)
                    knockback: { force: 240 } // Per-attack knockback (default type is 160)
                }
            },
            skeleton: {
                maxHealth: 50,
                speed: 20, // pixels per second (now properly scaled by deltaTime) - slowed down
                attackRange: 50,
                attackDamage: 8,
                attackArcDegrees: 90,
                detectionRange: 250,
                color: '#cccccc',
                attackCooldown: 0.83, // seconds (was 50 frames at 60fps)
                windUpTime: 0.7, // seconds before attack hits
                knockback: {
                    force: 190, // Knockback force when skeleton hits player (increased by 10)
                    decay: 0.87
                },
                projectile: {
                    enabled: true, // Skeletons are ranged enemies
                    speed: 200, // Pixels per second - slowed down
                    damage: 6,
                    range: 400,
                    cooldown: 3.5 // Seconds between shots - increased cooldown
                }
            },
            demon: {
                maxHealth: 80,
                speed: 30, // pixels per second (now properly scaled by deltaTime) - slowed down
                attackRange: 60,
                attackDamage: 12,
                attackArcDegrees: 90,
                detectionRange: 300,
                color: '#aa4444',
                attackCooldown: 0.67, // seconds (was 40 frames at 60fps)
                windUpTime: 0.5, // seconds before attack hits
                knockback: {
                    force: 230, // Knockback force when demon hits player (stronger, increased by 10)
                    decay: 0.86
                }
            }
        },
        spawn: {
            maxEnemies: 20
        }
    },
    
    levels: {
        // Level-based enemy pack spawn configuration
        // Uses procedural generation similar to rocks/trees
        1: {
            packSpawn: {
                density: 0.008,  // ~10-12 packs
                packSize: { min: 2, max: 4 }
            }
        },
        2: {
            packSpawn: {
                density: 0.012,  // ~15-18 packs
                packSize: { min: 3, max: 5 }
            }
        },
        3: {
            packSpawn: {
                density: 0.016,  // ~20-24 packs
                packSize: { min: 4, max: 6 }
            }
        }
    },
    
    obstacles: {
        forest: {
            density: 0.03
        },
        rocks: {
            density: 0.015
        },
        border: {
            spacing: 50
        },
        structures: {
            houses: {
                enabled: true,
                count: 5
            },
            woodClusters: {
                enabled: true,
                count: 4,
                treesPerCluster: 8
            },
            settlements: {
                enabled: true,
                count: 2
            },
            firepits: {
                enabled: true,
                count: 3
            },
            sheds: {
                enabled: true,
                count: 4
            },
            wells: {
                enabled: true,
                count: 2
            }
        }
    },
    
    pathfinding: {
        cellSize: 25
    },
    
    camera: {
        smoothing: 0.1,
        minZoom: 1.0,
        maxZoom: 2.0,
        zoomSpeed: 0.05
    }
};

