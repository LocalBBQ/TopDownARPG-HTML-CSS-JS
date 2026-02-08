// Enemy Manager - manages enemy entities
class EnemyManager {
    constructor() {
        this.enemies = [];
        this.spawnTimer = 0;
        this.maxEnemies = GameConfig.enemy.spawn.maxEnemies;
        this.systems = null;
        this.currentLevel = 1;
        this.enemiesSpawned = false;
    }

    init(systems) {
        this.systems = systems;
    }

    spawnEnemy(x, y, type = 'goblin', entityManager, patrolConfig = null) {
        const config = GameConfig.enemy.types[type] || GameConfig.enemy.types.goblin;
        
        const enemy = new Entity(x, y, `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
        
        const ai = new AI(config.detectionRange, config.attackRange, patrolConfig);
        ai.enemyType = type; // Store enemy type for lunge detection
        
        // Get sprite manager for sprite components
        const spriteManager = this.systems ? this.systems.get('sprites') : null;
        
        // Determine sprite path based on enemy type
        let spritePath = null;
        let spriteSheetKey = null;
        if (type === 'goblin' && spriteManager) {
            spritePath = 'assets/sprites/enemies/Goblin.png';
            const found = spriteManager.findSpriteSheetByPath(spritePath);
            spriteSheetKey = found ? found.key : spritePath;
        }
        
        enemy
            .addComponent(new Transform(x, y, 25, 25))
            .addComponent(new Health(config.maxHealth))
            .addComponent(new EnemyMovement(config.speed, type)) // Pass enemy type for type-specific behavior
            .addComponent(new Combat(config.attackRange, config.attackDamage, Utils.degToRad(config.attackArcDegrees ?? 90), config.attackCooldown, config.windUpTime || 0.5, false, Weapons.sword, type)) // isPlayer=false, pass enemy type for specific attack class
            .addComponent(ai)
            .addComponent(new Renderable('enemy', { color: config.color }));
        
        // Add sprite components if sprite sheet is available
        if (spriteSheetKey && type === 'goblin') {
            const transform = enemy.getComponent(Transform);
            enemy
                .addComponent(new Sprite(spriteSheetKey, transform.width * 2, transform.height * 2))
                .addComponent(new Animation({
                    spriteSheetKey: spriteSheetKey,
                    defaultAnimation: 'idle',
                    animations: {
                        idle: {
                            row: 0, // Will be set dynamically based on direction
                            frames: [0], // First frame
                            frameDuration: 0.2
                        },
                        walkRight: {
                            row: 0,
                            frames: [0, 1, 2, 3],
                            frameDuration: 0.15
                        },
                        walkDown: {
                            row: 2,
                            frames: [0, 1, 2, 3],
                            frameDuration: 0.15
                        },
                        walkLeft: {
                            row: 1,
                            frames: [0, 1, 2, 3],
                            frameDuration: 0.15
                        },
                        walkUp: {
                            row: 3,
                            frames: [0, 1, 2, 3],
                            frameDuration: 0.15
                        },
                        walkBack: {
                            row: 4,
                            frames: [0, 1, 2, 3],
                            frameDuration: 0.15
                        }
                    }
                }));
        }
        
        // Store systems reference for components
        if (this.systems) {
            enemy.systems = this.systems;
        }
        
        this.enemies.push(enemy);
        
        if (entityManager) {
            entityManager.add(enemy, 'enemy');
        }
        
        return enemy;
    }

    // Spawn an enemy with patrol behavior (walks back and forth in a straight line)
    spawnPatrolEnemy(startX, startY, endX, endY, type = 'goblin', entityManager) {
        const patrolConfig = {
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY,
            distance: Utils.distance(startX, startY, endX, endY)
        };
        
        // Spawn at the start position
        return this.spawnEnemy(startX, startY, type, entityManager, patrolConfig);
    }

    generateEnemyPacks(worldWidth, worldHeight, packDensity = 0.008, packSize = { min: 2, max: 5 }, entityManager, obstacleManager) {
        const tileSize = GameConfig.world.tileSize;
        const numPacks = Math.floor(worldWidth * worldHeight * packDensity / (tileSize * tileSize));
        
        console.log(`Generating ${numPacks} enemy packs with density ${packDensity}`);
        
        const excludeArea = {
            x: worldWidth / 2,
            y: worldHeight / 2,
            radius: 200 // Same exclusion zone as rocks/trees
        };
        
        let packsPlaced = 0;
        let attempts = 0;
        const maxAttempts = numPacks * 3;
        
        while (packsPlaced < numPacks && attempts < maxAttempts) {
            attempts++;
            
            // Random pack center position
            const packCenterX = Utils.randomInt(0, worldWidth);
            const packCenterY = Utils.randomInt(0, worldHeight);
            
            // Exclude center area (player spawn)
            const distFromCenter = Utils.distance(packCenterX, packCenterY, excludeArea.x, excludeArea.y);
            if (distFromCenter < excludeArea.radius) {
                continue;
            }
            
            // Determine pack size (number of enemies in this pack)
            const enemiesInPack = Utils.randomInt(packSize.min, packSize.max);
            const packRadius = 80; // How spread out enemies are within a pack
            
            let enemiesSpawnedInPack = 0;
            const packMaxAttempts = enemiesInPack * 5;
            let packAttempts = 0;
            
            // Try to spawn enemies around the pack center
            while (enemiesSpawnedInPack < enemiesInPack && packAttempts < packMaxAttempts) {
                packAttempts++;
                
                // Random position within pack radius
                const angle = Math.random() * Math.PI * 2;
                const distance = Utils.random(0, packRadius);
                const x = packCenterX + Math.cos(angle) * distance;
                const y = packCenterY + Math.sin(angle) * distance;
                
                // Clamp to world bounds
                const clampedX = Utils.clamp(x, 0, worldWidth);
                const clampedY = Utils.clamp(y, 0, worldHeight);
                
                // Check if position is valid (not blocked by obstacles)
                if (!obstacleManager || obstacleManager.canMoveTo(clampedX, clampedY, 25, 25)) {
                    // Random enemy type (or use level-based distribution)
                    const types = ['goblin', 'goblin', 'skeleton', 'demon'];
                    const randomType = types[Utils.randomInt(0, types.length - 1)];
                    
                    this.spawnEnemy(clampedX, clampedY, randomType, entityManager);
                    enemiesSpawnedInPack++;
                }
            }
            
            // If we spawned at least one enemy, count this as a successful pack
            if (enemiesSpawnedInPack > 0) {
                packsPlaced++;
            }
        }
        
        console.log(`Successfully placed ${packsPlaced} enemy packs with ${this.enemies.length} total enemies`);
    }

    // Spawn enemies for a specific level using procedural pack spawning
    spawnLevelEnemies(level, entityManager, obstacleManager) {
        const levelConfig = GameConfig.levels[level];
        if (!levelConfig) {
            console.warn(`No config defined for level ${level}`);
            return;
        }

        this.currentLevel = level;
        this.enemiesSpawned = true;

        const worldConfig = GameConfig.world;
        
        // Get pack config from level or use defaults
        const packConfig = levelConfig.packSpawn || {
            density: 0.008,
            packSize: { min: 2, max: 5 }
        };
        
        // Use procedural pack spawning
        this.generateEnemyPacks(
            worldConfig.width, 
            worldConfig.height, 
            packConfig.density,
            packConfig.packSize,
            entityManager,
            obstacleManager
        );
    }

    update(deltaTime, systems) {
        const entityManager = systems.get('entities');
        const obstacleManager = systems.get('obstacles');
        const healthOrbManager = systems.get('healthOrbs');
        
        // Update all enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            const health = enemy.getComponent(Health);
            if (health && health.isDead) {
                // Spawn health orb at enemy position (20% drop rate)
                const enemyTransform = enemy.getComponent(Transform);
                if (enemyTransform && healthOrbManager && Math.random() < 0.2) {
                    healthOrbManager.createOrb(enemyTransform.x, enemyTransform.y, 20);
                }
                
                if (entityManager) {
                    entityManager.remove(enemy.id);
                }
                this.enemies.splice(i, 1);
                continue;
            }
        }
    }

    checkPlayerAttack(player) {
        const combat = player.getComponent(Combat);
        const transform = player.getComponent(Transform);
        const movement = player.getComponent(Movement);
        
        if (!combat || !combat.isAttacking) {
            return [];
        }
        
        const hitEnemies = [];
        
        // Sensitivity buffers for more generous hit detection
        const rangeSensitivity = 30; // Extra 30 pixels of detection range
        const arcSensitivity = 0.3; // Extra ~17 degrees on each side
        
        // Check if this is a 360/circular attack (shape-based, not stage index)
        const is360Attack = combat.currentAttackIsCircular;
        
        for (const enemy of this.enemies) {
            const enemyHealth = enemy.getComponent(Health);
            const enemyTransform = enemy.getComponent(Transform);
            
            if (!enemyHealth || !enemyTransform || enemyHealth.isDead) continue;
            
            // Skip if this enemy was already hit in this attack (prevents multiple hits on same enemy)
            const alreadyHitEnemies = combat.isPlayer && combat.playerAttack ? combat.playerAttack.hitEnemies : new Set();
            if (alreadyHitEnemies.has(enemy.id)) continue;

            // Account for enemy hitbox size - use the larger dimension as radius
            const enemyHitboxRadius = Math.max(enemyTransform.width, enemyTransform.height) / 2;
            
            // Check distance to edge of enemy hitbox, not center
            const distToCenter = Utils.distance(transform.x, transform.y, enemyTransform.x, enemyTransform.y);
            const distToEdge = Math.max(0, distToCenter - enemyHitboxRadius);
            
            // Apply range sensitivity buffer
            if (distToEdge < combat.attackRange + rangeSensitivity) {
                let hitEnemy = false;
                
                if (is360Attack) {
                    // 360 attack hits everything in range, no arc check needed
                    hitEnemy = true;
                } else {
                    // Normal arc-based attack
                    const facingAngle = movement ? movement.facingAngle : 0;
                    
                    // Apply arc sensitivity buffer (wider angle tolerance)
                    const generousArc = combat.attackArc + arcSensitivity;
                    const generousRange = combat.attackRange + rangeSensitivity;
                    
                    hitEnemy = Utils.pointInArc(
                        enemyTransform.x, enemyTransform.y,
                        transform.x, transform.y,
                        facingAngle, generousArc, generousRange
                    );
                }
                
                if (hitEnemy) {
                    enemyHealth.takeDamage(combat.attackDamage);
                    hitEnemies.push(enemy);
                    
                    // Apply knockback to enemy (stage/weapon config or player default)
                    const enemyMovement = enemy.getComponent(Movement);
                    if (enemyMovement) {
                        const dx = enemyTransform.x - transform.x;
                        const dy = enemyTransform.y - transform.y;
                        const knockbackForce = combat.currentAttackKnockbackForce ?? GameConfig.player.knockback.force;
                        enemyMovement.applyKnockback(dx, dy, knockbackForce);
                    }
                    
                    // Mark this enemy as hit to prevent multiple hits
                    if (combat.isPlayer && combat.playerAttack) {
                        combat.playerAttack.markEnemyHit(enemy.id);
                    }
                }
            }
        }
        
        // Only mark as processed for non-extended attacks
        // Circular attacks continue checking during extended window
        if (combat.isPlayer && combat.playerAttack && !combat.currentAttackIsCircular) {
            // Player attacks handle their own processing
        } else if (combat.goblinAttack) {
            combat.goblinAttack.attackProcessed = true;
        } else if (combat.skeletonAttack) {
            combat.skeletonAttack.attackProcessed = true;
        } else if (combat.enemyAttack) {
            // Fallback for unknown enemy types
            combat.enemyAttack.attackProcessed = true;
        }
        
        return hitEnemies;
    }

    checkEnemyAttacks(player) {
        if (!player) return;

        const playerHealth = player.getComponent(Health);
        const playerTransform = player.getComponent(Transform);
        
        if (!playerHealth || !playerTransform || playerHealth.isDead) return;

        for (const enemy of this.enemies) {
            const enemyCombat = enemy.getComponent(Combat);
            const enemyTransform = enemy.getComponent(Transform);
            const enemyHealth = enemy.getComponent(Health);
            const enemyMovement = enemy.getComponent(Movement);
            
            if (!enemyCombat || !enemyTransform || !enemyHealth || enemyHealth.isDead) continue;
            
            // Get player combat component to check for blocking
            const playerCombat = player.getComponent(Combat);
            const playerMovement = player.getComponent(Movement);
            
            // Check for lunge attack collision (continuous check during lunge)
            // Only check lunge if enemy is actively lunging (movement-wise) and is a goblin
            const ai = enemy.getComponent(AI);
            const enemyType = ai ? ai.enemyType : 'goblin';
            const isGoblin = enemyType === 'goblin';
            
            if (enemyMovement && enemyMovement.isLunging && enemyCombat.isLunging && isGoblin) {
                const currentDist = Utils.distance(
                    enemyTransform.x, enemyTransform.y,
                    playerTransform.x, playerTransform.y
                );
                
                // Lunge attack: check if enemy is colliding with player during lunge
                const enemyRadius = enemyTransform.width / 2;
                const playerRadius = playerTransform.width / 2;
                // Add buffer for lunge attacks to account for player movement during lunge
                const lungeCollisionBuffer = 10; // Extra pixels for more forgiving collision
                const collisionDist = enemyRadius + playerRadius + lungeCollisionBuffer;
                
                if (currentDist < collisionDist && !enemyCombat.attackProcessed) {
                    // Deal lunge damage to player (goblin-specific)
                    const lungeDamage = enemyCombat.goblinAttack ? enemyCombat.goblinAttack.lungeDamage : enemyCombat.attackDamage;
                    
                    // Check if player is blocking and can block this attack
                    let finalDamage = lungeDamage;
                    let blocked = false;
                    if (playerCombat && playerCombat.isBlocking && playerMovement) {
                        // Calculate angle from player to enemy (direction attack is coming from)
                        const attackAngle = Utils.angleTo(
                            playerTransform.x, playerTransform.y,
                            enemyTransform.x, enemyTransform.y
                        );
                        
                        if (playerCombat.canBlockAttack(attackAngle, playerMovement.facingAngle)) {
                            // Check if player has enough stamina to block this attack
                            if (playerCombat.consumeBlockStamina()) {
                                // Block successful - reduce damage
                                finalDamage = lungeDamage * (1 - playerCombat.blockDamageReduction);
                                blocked = true;
                            }
                            // If not enough stamina, block fails and full damage is dealt
                        }
                    }
                    
                    playerHealth.takeDamage(finalDamage, blocked);
                    
                    // Apply knockback to player if not blocked (per-attack: lunge.knockback or type default)
                    if (!blocked && playerMovement && (!playerCombat || !playerCombat.isBlocking)) {
                        const ai = enemy.getComponent(AI);
                        const enemyType = ai ? ai.enemyType : 'goblin';
                        const enemyConfig = GameConfig.enemy.types[enemyType] || GameConfig.enemy.types.goblin;
                        const knockbackConfig = enemyConfig.knockback || { force: 160, decay: 0.88 };
                        const lungeKnockbackForce = enemyConfig.lunge?.knockback?.force ?? knockbackConfig.force;
                        const finalKnockbackForce = lungeKnockbackForce * GameConfig.player.knockback.receivedMultiplier;
                        const dx = playerTransform.x - enemyTransform.x;
                        const dy = playerTransform.y - enemyTransform.y;
                        playerMovement.applyKnockback(dx, dy, finalKnockbackForce);
                    }
                    
                    if (enemyCombat.goblinAttack) {
                        enemyCombat.goblinAttack.attackProcessed = true;
                    }
                }
            }
            // Check if enemy attack has completed wind-up and is ready to hit (normal attacks)
            // Only process normal attacks if not currently lunging
            // Skeletons don't have melee attacks - they only use projectiles
            const isDemon = enemyCombat.demonAttack !== null && enemyCombat.demonAttack !== undefined;
            const isSkeleton = enemyType === 'skeleton';
            const isGoblinMelee = isGoblin && !enemyMovement.isLunging;
            
            // Skip melee attack processing for skeletons (they only use projectiles)
            if (isSkeleton) {
                continue;
            }
            
            const attackProcessed = isDemon 
                ? enemyCombat.demonAttack.hasHitEnemy('player')
                : (enemyCombat.attackProcessed || false);
            
            if ((!enemyMovement || !enemyMovement.isLunging) && enemyCombat.isAttacking && !attackProcessed && !enemyCombat.isLunging && (isGoblinMelee || isDemon)) {
                const currentDist = Utils.distance(
                    enemyTransform.x, enemyTransform.y,
                    playerTransform.x, playerTransform.y
                );
                
                // Get attack properties (from demon combo or legacy)
                const attackRange = enemyCombat.attackRange;
                const attackDamage = enemyCombat.attackDamage;
                const attackArc = enemyCombat.attackArc;
                const isCircular = enemyCombat.currentAttackIsCircular;
                
                // Check if player is in range
                let inRange = false;
                if (isCircular) {
                    // Circular attack - check distance only
                    inRange = currentDist < attackRange;
                } else {
                    // Arc-based attack - check if player is within attack arc
                    inRange = Utils.pointInArc(
                        playerTransform.x, playerTransform.y,
                        enemyTransform.x, enemyTransform.y,
                        enemyMovement.facingAngle,
                        attackArc,
                        attackRange
                    );
                }
                
                if (inRange) {
                    let finalDamage = attackDamage;
                    let blocked = false;
                    
                    // Check if player is blocking and can block this attack
                    if (playerCombat && playerCombat.isBlocking && playerMovement) {
                        // Calculate angle from player to enemy (direction attack is coming from)
                        const attackAngle = Utils.angleTo(
                            playerTransform.x, playerTransform.y,
                            enemyTransform.x, enemyTransform.y
                        );
                        
                        if (playerCombat.canBlockAttack(attackAngle, playerMovement.facingAngle)) {
                            // Check if player has enough stamina to block this attack
                            if (playerCombat.consumeBlockStamina()) {
                                // Block successful - reduce damage
                                finalDamage = attackDamage * (1 - playerCombat.blockDamageReduction);
                                blocked = true;
                            }
                            // If not enough stamina, block fails and full damage is dealt
                        }
                    }
                    
                    // Deal damage to player
                    playerHealth.takeDamage(finalDamage, blocked);
                    
                    // Mark as hit for demons using DemonAttack
                    if (isDemon && enemyCombat.demonAttack) {
                        enemyCombat.demonAttack.markEnemyHit('player');
                    }
                    
                    // Mark as processed for goblins
                    if (isGoblin && enemyCombat.goblinAttack) {
                        enemyCombat.goblinAttack.attackProcessed = true;
                    }
                    
                    // Apply knockback to player if not blocked (normal attack: type knockback)
                    if (!blocked && playerMovement && (!playerCombat || !playerCombat.isBlocking)) {
                        const enemyConfig = GameConfig.enemy.types[enemyType] || GameConfig.enemy.types.goblin;
                        const knockbackConfig = enemyConfig.knockback || { force: 160, decay: 0.88 };
                        const finalKnockbackForce = knockbackConfig.force * GameConfig.player.knockback.receivedMultiplier;
                        const dx = playerTransform.x - enemyTransform.x;
                        const dy = playerTransform.y - enemyTransform.y;
                        playerMovement.applyKnockback(dx, dy, finalKnockbackForce);
                    }
                }
                
                // Attack processed flag is set above for goblins and demons
            }
        }
    }

    getAliveCount() {
        return this.enemies.filter(e => {
            const health = e.getComponent(Health);
            return health && !health.isDead;
        }).length;
    }

    // Change to a different level (clears current enemies and spawns new ones)
    changeLevel(level, entityManager, obstacleManager) {
        // Clear all current enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (entityManager) {
                entityManager.remove(enemy.id);
            }
        }
        this.enemies = [];
        
        // Spawn enemies for the new level
        this.spawnLevelEnemies(level, entityManager, obstacleManager);
    }

    getCurrentLevel() {
        return this.currentLevel;
    }
}

