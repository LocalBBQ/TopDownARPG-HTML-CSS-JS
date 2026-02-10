// Centralized game configuration
const GameConfig = {
    world: {
        width: 4800,
        height: 2800,
        tileSize: 50
    },

    /** Entity-vs-entity collision: buffer (px) added so player and enemies don't get as close. */
    entityCollision: {
        buffer: 12
    },

    /** Ground texture registry: id -> asset path. Use theme.ground.texture = id in levels. */
    groundTextures: {
        grass: 'assets/sprites/environment/Grass1.png'
        // e.g. dirt: 'assets/sprites/environment/Dirt1.png',
        // stone: 'assets/sprites/environment/Stone1.png',
    },

    player: {
        startX: 2400,
        startY: 1400,
        width: 30,
        height: 30,
        speed: 100, // pixels per second (now properly scaled by deltaTime)
        maxHealth: 100,
        maxStamina: 100,
        staminaRegen: 6.75, // stamina per second (scaled by deltaTime)
        attackRange: 80,
        attackDamage: 15,
        attackArcDegrees: 60,
        attackCooldown: 0.3, // seconds - faster for combos (was 0.5)
        color: '#8b8b9a', // steel (fallback when knight sprites not loaded)
        defaultWeapon: 'swordAndShield',
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
            enabled: false, // Temporarily disabled for player; projectile system still used by enemies
            speed: 400, // Pixels per second
            damage: 10, // Base damage
            range: 500, // Maximum travel distance
            cooldown: 0.5, // Seconds between shots
            staminaCost: 8, // Stamina cost per shot
            stunBuildup: 20
        },
        crossbow: {
            damage: 22,
            speed: 550,
            range: 600,
            staminaCost: 12,
            stunBuildup: 25,
            reloadTime: 1.4,           // seconds to fully reload
            perfectWindowStart: 0.62,   // perfect reload zone start (0–1)
            perfectWindowEnd: 0.78,     // perfect reload zone end (0–1)
            perfectReloadDamageMultiplier: 1.5  // damage multiplier on next shot if perfect reload
        },
        healthOrbDropChance: 0.25, // 25% chance for enemies to drop a health orb on death
        stun: {
            threshold: 100,      // stun meter fills to this, then stun triggers
            duration: 1,        // stun duration in seconds
            decayPerSecond: 15,  // meter drains when not being hit (0 = no decay)
            decayCooldown: 4,   // seconds after last stun buildup before decay starts (player only)
            blockedMultiplier: 0.5  // stun buildup when hit is blocked (0.5 = 50%, 1 = full)
        }
    },

    statusEffects: {
        enemyStunThreshold: 100,  // enemy stun meter threshold
        enemyStunDuration: 1,     // seconds enemies are stunned when meter fills
        enemyStunDecayPerSecond: 20  // enemy meter decay (0 = no decay)
    },
    
    enemy: {
        types: {
            goblin: {
                maxHealth: 30,
                speed: 25, // pixels per second (now properly scaled by deltaTime) - slowed down
                attackRange: 40,        // Swipe hitbox: max distance (px) to hit player
                attackDamage: 5,
                attackArcDegrees: 90,   // Swipe arc (degrees) – goblin currently uses range only
                detectionRange: 200,
                color: '#44aa44',
                attackCooldown: 1.0, // seconds (was 60 frames at 60fps)
                windUpTime: 0.6, // seconds before attack hits
                stunBuildupPerHit: 18,  // stun meter added to player when goblin hits
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
                    hitRadiusBonus: 0, // Extra px added to enemy+player radius for lunge hit (bigger = easier to get hit)
                    knockback: { force: 240 }, // Per-attack knockback (default type is 160)
                    hopBackChance: 0.5, // 50% chance to hop backward after lunge
                    hopBackDelay: 0.75, // Seconds to wait before hopping back (750ms)
                    hopBackDistance: 60, // Pixels to hop back
                    hopBackSpeed: 140 // Speed during hop back
                }
            },
            skeleton: {
                maxHealth: 50,
                speed: 20, // pixels per second (now properly scaled by deltaTime) - slowed down
                attackRange: 50,
                attackDamage: 8,
                attackArcDegrees: 90,
                color: '#cccccc',
                attackCooldown: 1.5, // seconds (was 50 frames at 60fps)
                windUpTime: 0.7, // seconds before attack hits
                stunBuildupPerHit: 15,
                knockback: {
                    force: 190, // Knockback force when skeleton hits player (increased by 10)
                    decay: 0.87
                },
                projectile: {
                    enabled: true, // Skeletons are ranged enemies
                    speed: 200, // Pixels per second - slowed down
                    damage: 6,
                    range: 280,
                    cooldown: 3.5, // Seconds between shots - increased cooldown
                    stunBuildup: 15
                }
            },
            lesserDemon: {
                maxHealth: 45,
                speed: 32, // pixels per second - faster than goblin
                attackRange: 45,
                attackDamage: 7,
                attackArcDegrees: 90,
                detectionRange: 220,
                color: '#884444',
                attackCooldown: 0.85, // seconds - faster than goblin
                windUpTime: 0.5, // seconds before attack hits
                stunBuildupPerHit: 18,
                knockback: {
                    force: 180, // Knockback force when lesser demon hits player
                    decay: 0.87
                },
                lunge: {
                    enabled: true,
                    chargeRange: 160, // Distance at which lesser demon starts charging lunge
                    chargeTime: 0.7, // Time to charge up the lunge - faster than goblin
                    lungeSpeed: 220, // Speed during lunge - faster than goblin
                    lungeDistance: 130, // Maximum distance to lunge
                    lungeDamage: 10, // Damage dealt by lunge (higher than goblin)
                    knockback: { force: 260 } // Per-attack knockback
                }
            },
            greaterDemon: {
                maxHealth: 80,
                speed: 30, // pixels per second (now properly scaled by deltaTime) - slowed down
                attackRange: 60,
                attackDamage: 12,
                attackArcDegrees: 90,
                detectionRange: 300,
                color: '#aa4444',
                attackCooldown: 0.67, // seconds (was 40 frames at 60fps)
                windUpTime: 0.5, // seconds before attack hits
                stunBuildupPerHit: 22,
                knockback: {
                    force: 230, // Knockback force when demon hits player (stronger, increased by 10)
                    decay: 0.86
                },
                pillarFlame: {
                    castDelay: 2.0,   // Telegraph time before pillar spawns (more time to escape)
                    activeDuration: 2.0,
                    radius: 45,
                    damage: 8,
                    damageInterval: 0.4,
                    cooldown: 18.0,   // Seconds before same demon can cast again (fewer pillars)
                    pillarRange: 220
                }
            }
        },
        spawn: {
            maxEnemies: 20
        }
    },
    
    // Portal spawns at this position when kills required for current level are met
    portal: {
        x: 2400,
        y: 1400,
        width: 80,
        height: 80
    },

    // Safe hub: static square tile room, no procedural gen; camera follows player (later: NPCs)
    hub: {
        name: 'Sanctuary',
        tileSize: 50,
        width: 1600,
        height: 1600,
        playerStart: { x: 800, y: 800 },
        board: { x: 750, y: 765, width: 100, height: 70 },
        theme: {
            ground: { r: 42, g: 38, b: 32, variation: 6 },
            sky: 'rgba(100, 90, 80, 0.06)'
        },
        // Static walls: room inset by 200px on each side so there is space around the sanctuary
        walls: [
            { x: 200, y: 200, width: 1200, height: 50 },
            { x: 200, y: 1350, width: 1200, height: 50 },
            { x: 200, y: 200, width: 50, height: 1200 },
            { x: 1350, y: 200, width: 50, height: 1200 }
        ]
    },

    levels: {
        // Level 0 = hub (Sanctuary); no enemies, no portal, level-select board
        0: {
            name: 'Sanctuary',
            tileSize: 50,
            width: 1600,
            height: 1600,
            playerStart: { x: 800, y: 800 },
            board: { x: 750, y: 765, width: 100, height: 70 },
            theme: {
                ground: { r: 42, g: 38, b: 32, variation: 6 },
                sky: 'rgba(100, 90, 80, 0.06)'
            },
            walls: [
                { x: 200, y: 200, width: 1200, height: 50 },
                { x: 200, y: 1350, width: 1200, height: 50 },
                { x: 200, y: 200, width: 50, height: 1200 },
                { x: 1350, y: 200, width: 50, height: 1200 }
            ]
        },
        // Level-based enemy pack + theme (ground colors) + obstacles; portal after killsToUnlockPortal
        1: {
            name: 'Village Outskirts',
            packSpawn: { density: 0.008, packSize: { min: 2, max: 4 } },
            enemyTypes: ['goblin'],
            killsToUnlockPortal: 10,
            theme: {
                ground: { r: 38, g: 48, b: 38, variation: 8, texture: 'grass' },
                sky: 'rgba(135, 206, 235, 0.05)'
            },
            // Optional world size when using scene tiles (6*800 x 3*800)
            worldWidth: 4800,
            worldHeight: 2400,
            obstacles: {
                border: { spacing: 50 },
                useSceneTiles: true,
                sceneTileLayout: {
                    tileSize: 800,
                    cols: 6,
                    rows: 3,
                    // Weights: higher = more common. Open areas dominant; few settled/encounter tiles.
                    pool: [
                        { id: 'clearing', weight: 5 },
                        { id: 'crossroads', weight: 4 },
                        { id: 'orchardEdge', weight: 3 },
                        { id: 'thickGrove', weight: 3 },
                        { id: 'waysideShrine', weight: 2 },
                        { id: 'woodcutterClearing', weight: 2 },
                        { id: 'lumberMill', weight: 1 },
                        { id: 'lumberMillB', weight: 1 },
                        { id: 'smallFarm', weight: 1 },
                        { id: 'goblinCamp', weight: 1 },
                        { id: 'goblinCampB', weight: 1 },
                        { id: 'banditAmbush', weight: 0.5 }
                    ]
                }
            }
        },
        2: {
            name: 'Cursed Wilds',
            packSpawn: { density: 0.012, packSize: { min: 3, max: 5 } },
            enemyTypes: ['goblin', 'goblin', 'skeleton', 'skeleton'],
            killsToUnlockPortal: 15,
            theme: {
                ground: { r: 28, g: 26, b: 24, variation: 10 },
                sky: 'rgba(60, 55, 70, 0.08)'
            },
            obstacles: {
                mushrooms: { density: 0.028 },
                darkRocks: { density: 0.02 },
                border: { spacing: 50, type: 'mushroom' },
                graves: { count: 18 },
                swampPools: { count: 10 },
                structures: {
                    houses: { enabled: false },
                    woodClusters: { enabled: false },
                    settlements: { enabled: false },
                    firepits: { enabled: true, count: 1 },
                    sheds: { enabled: false },
                    wells: { enabled: false },
                    ruins: { enabled: true, rubblePiles: 15, pillarClusters: 4, ruinedWalls: 10, ruinedStructures: 2, brokenArches: 3, statueRemnants: 8 }
                }
            }
        },
        3: {
            name: 'Demon Approach',
            packSpawn: { density: 0.016, packSize: { min: 4, max: 6 } },
            enemyTypes: ['skeleton', 'skeleton', 'lesserDemon', 'lesserDemon'],
            killsToUnlockPortal: 20,
            theme: {
                ground: { r: 34, g: 16, b: 18, variation: 12 },
                sky: 'rgba(80, 20, 30, 0.12)'
            },
            obstacles: {
                lavaRocks: { density: 0.025 },
                demonPillars: { count: 14 },
                braziers: { count: 12 },
                border: { spacing: 50, type: 'lavaRock' },
                structures: {
                    houses: { enabled: false },
                    woodClusters: { enabled: false },
                    settlements: { enabled: false },
                    firepits: { enabled: false },
                    sheds: { enabled: false },
                    wells: { enabled: false },
                    ruins: { enabled: true, rubblePiles: 20, pillarClusters: 8, ruinedWalls: 12, ruinedStructures: 6, brokenArches: 4, statueRemnants: 10 }
                }
            }
        }
    },

    // Default obstacles config (used if a level omits obstacles; level configs override)
    obstacles: {
        forest: {
            density: 0.025
        },
        rocks: {
            density: 0.022
        },
        border: {
            spacing: 50
        },
        structures: {
            houses: {
                enabled: true,
                count: 3
            },
            woodClusters: {
                enabled: true,
                count: 3,
                treesPerCluster: 6
            },
            settlements: {
                enabled: true,
                count: 1
            },
            firepits: {
                enabled: true,
                count: 2
            },
            sheds: {
                enabled: true,
                count: 2
            },
            wells: {
                enabled: true,
                count: 1
            },
            ruins: {
                enabled: true,
                rubblePiles: 12,
                pillarClusters: 6,
                ruinedWalls: 8,
                ruinedStructures: 4,
                brokenArches: 5,
                statueRemnants: 6
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

