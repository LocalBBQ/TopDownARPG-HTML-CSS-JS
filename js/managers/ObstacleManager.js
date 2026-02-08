// Obstacle/Environment objects for collision
class Obstacle {
    constructor(x, y, width, height, type = 'tree') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.sprite = null;
        this.spritePath = null;
    }

    checkCollision(entity) {
        const transform = entity.getComponent(Transform);
        if (!transform) return false;
        
        return Utils.rectCollision(
            this.x, this.y, this.width, this.height,
            transform.left, transform.top, transform.width, transform.height
        );
    }
}

// Object Factory - defines configurations for different object types
class ObjectFactory {
    constructor() {
        this.configs = {
            tree: {
                minSize: 40,
                maxSize: 60,
                defaultSpritePath: 'assets/tree.png',
                color: '#2d5016'
            },
            rock: {
                minSize: 30,
                maxSize: 50,
                defaultSpritePath: 'assets/rock.png',
                color: '#555555'
            },
            bush: {
                minSize: 25,
                maxSize: 35,
                defaultSpritePath: 'assets/bush.png',
                color: '#3a5a2a'
            },
            house: {
                minSize: 160,
                maxSize: 240,
                defaultSpritePath: 'assets/house.png',
                color: '#8b4513'
            },
            wall: {
                minSize: 20,
                maxSize: 20,  // Fixed size for consistent walls
                defaultSpritePath: 'assets/wall.png',
                color: '#696969'
            },
            door: {
                minSize: 60,
                maxSize: 80,
                defaultSpritePath: 'assets/door.png',
                color: '#654321'
            },
            shed: {
                minSize: 100,
                maxSize: 140,
                defaultSpritePath: 'assets/shed.png',
                color: '#654321'
            },
            firepit: {
                minSize: 30,
                maxSize: 40,
                defaultSpritePath: 'assets/firepit.png',
                color: '#ff6600'
            },
            well: {
                minSize: 40,
                maxSize: 50,
                defaultSpritePath: 'assets/well.png',
                color: '#888888'
            },
            fence: {
                minSize: 15,
                maxSize: 20,
                defaultSpritePath: 'assets/fence.png',
                color: '#8b7355'
            },
            barrel: {
                minSize: 25,
                maxSize: 35,
                defaultSpritePath: 'assets/barrel.png',
                color: '#4a4a4a'
            }
        };
    }

    getConfig(type) {
        return this.configs[type] || this.configs.tree;
    }

    createObject(x, y, type = 'tree', customSize = null, spritePath = null) {
        const config = this.getConfig(type);
        const size = customSize || Utils.randomInt(config.minSize, config.maxSize);
        const path = spritePath || config.defaultSpritePath;
        
        return {
            x: x,
            y: y,
            width: size,
            height: size,
            type: type,
            spritePath: path,
            color: config.color
        };
    }

    createObjectsInArea(startX, startY, endX, endY, type, count, excludeArea = null) {
        const objects = [];
        const config = this.getConfig(type);
        
        for (let i = 0; i < count; i++) {
            let x, y;
            let attempts = 0;
            const maxAttempts = 100;
            
            do {
                x = Utils.randomInt(startX, endX - config.maxSize);
                y = Utils.randomInt(startY, endY - config.maxSize);
                attempts++;
            } while (excludeArea && 
                     Utils.distance(x, y, excludeArea.x, excludeArea.y) < excludeArea.radius &&
                     attempts < maxAttempts);
            
            if (attempts < maxAttempts) {
                objects.push(this.createObject(x, y, type));
            }
        }
        
        return objects;
    }

    createObjectsAlongBorder(worldWidth, worldHeight, type, spacing, border = 'all') {
        const objects = [];
        const config = this.getConfig(type);
        const maxSize = config.maxSize;
        
        if (border === 'all' || border === 'top') {
            for (let x = 0; x < worldWidth; x += spacing) {
                objects.push(this.createObject(x, 0, type));
            }
        }
        
        if (border === 'all' || border === 'bottom') {
            for (let x = 0; x < worldWidth; x += spacing) {
                objects.push(this.createObject(x, worldHeight - maxSize, type));
            }
        }
        
        if (border === 'all' || border === 'left') {
            for (let y = spacing; y < worldHeight - spacing; y += spacing) {
                objects.push(this.createObject(0, y, type));
            }
        }
        
        if (border === 'all' || border === 'right') {
            for (let y = spacing; y < worldHeight - spacing; y += spacing) {
                objects.push(this.createObject(worldWidth - maxSize, y, type));
            }
        }
        
        return objects;
    }
}

// Structure Generator - creates complex patterns like houses, wood clusters, etc.
class StructureGenerator {
    constructor(obstacleManager) {
        this.obstacleManager = obstacleManager;
        this.factory = obstacleManager.factory;
    }

    // Generate a simple house structure
    generateHouse(centerX, centerY, size = 200) {
        const houseObjects = [];
        const wallThickness = 20;
        const doorWidth = 80;
        const wallSegmentSize = 20; // Fixed wall segment size for grid alignment
        
        // House walls (rectangle)
        const halfSize = size / 2;
        
        // Create walls using grid-based segments for consistency
        // Top wall - create segments along the top edge
        const topWallSegments = Math.ceil(size / wallSegmentSize);
        for (let i = 0; i < topWallSegments; i++) {
            const segmentX = centerX - halfSize + (i * wallSegmentSize);
            const segmentWidth = Math.min(wallSegmentSize, centerX + halfSize - segmentX);
            if (segmentWidth > 0) {
                this.createWallSegment(segmentX, centerY - halfSize, segmentWidth, wallThickness, houseObjects);
            }
        }
        
        // Bottom wall
        for (let i = 0; i < topWallSegments; i++) {
            const segmentX = centerX - halfSize + (i * wallSegmentSize);
            const segmentWidth = Math.min(wallSegmentSize, centerX + halfSize - segmentX);
            if (segmentWidth > 0) {
                this.createWallSegment(segmentX, centerY + halfSize - wallThickness, segmentWidth, wallThickness, houseObjects);
            }
        }
        
        // Left wall (with door opening in the middle)
        const leftWallHeight = size;
        const leftWallSegments = Math.ceil(leftWallHeight / wallSegmentSize);
        const doorStartSegment = Math.floor((leftWallSegments / 2) - (doorWidth / 2 / wallSegmentSize));
        const doorSegmentCount = Math.ceil(doorWidth / wallSegmentSize);
        
        for (let i = 0; i < leftWallSegments; i++) {
            // Skip segments that are part of the door opening
            if (i >= doorStartSegment && i < doorStartSegment + doorSegmentCount) {
                continue;
            }
            const segmentY = centerY - halfSize + (i * wallSegmentSize);
            const segmentHeight = Math.min(wallSegmentSize, centerY + halfSize - segmentY);
            if (segmentHeight > 0) {
                this.createWallSegment(centerX - halfSize, segmentY, wallThickness, segmentHeight, houseObjects);
            }
        }
        
        // Right wall
        for (let i = 0; i < leftWallSegments; i++) {
            const segmentY = centerY - halfSize + (i * wallSegmentSize);
            const segmentHeight = Math.min(wallSegmentSize, centerY + halfSize - segmentY);
            if (segmentHeight > 0) {
                this.createWallSegment(centerX + halfSize - wallThickness, segmentY, wallThickness, segmentHeight, houseObjects);
            }
        }
        
        return houseObjects;
    }

    createWallSegment(x, y, width, height, objects) {
        // Create wall segment with fixed dimensions for grid alignment
        const segment = {
            x: x,
            y: y,
            width: width,
            height: height,
            type: 'wall',
            spritePath: this.factory.getConfig('wall').defaultSpritePath,
            color: this.factory.getConfig('wall').color
        };
        objects.push(segment);
    }

    // Generate a wood cluster (trees in a natural pattern)
    generateWoodCluster(centerX, centerY, radius = 150, treeCount = 8) {
        const trees = [];
        
        // Create a cluster with trees distributed in a natural pattern
        for (let i = 0; i < treeCount; i++) {
            // Use a more natural distribution (slightly clustered)
            const angle = Math.random() * Math.PI * 2;
            const distance = Utils.random(0, radius * (0.3 + Math.random() * 0.7)); // More trees near center
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            const tree = this.factory.createObject(x, y, 'tree');
            trees.push(tree);
        }
        
        return trees;
    }

    // Generate a tree line (for paths or boundaries)
    generateTreeLine(startX, startY, endX, endY, spacing = 60, jitter = 10) {
        const trees = [];
        const distance = Utils.distance(startX, startY, endX, endY);
        const numTrees = Math.floor(distance / spacing);
        const angle = Math.atan2(endY - startY, endX - startX);
        
        for (let i = 0; i <= numTrees; i++) {
            const t = i / numTrees;
            let x = startX + (endX - startX) * t;
            let y = startY + (endY - startY) * t;
            
            // Add perpendicular jitter for natural look
            const perpAngle = angle + Math.PI / 2;
            x += Math.cos(perpAngle) * Utils.random(-jitter, jitter);
            y += Math.sin(perpAngle) * Utils.random(-jitter, jitter);
            
            const tree = this.factory.createObject(x, y, 'tree');
            trees.push(tree);
        }
        
        return trees;
    }

    // Generate a simple shed
    generateShed(centerX, centerY, size = 120) {
        const shed = this.factory.createObject(centerX, centerY, 'shed', size);
        return [shed];
    }

    // Generate a firepit with seating area
    generateFirepit(centerX, centerY, radius = 100) {
        const objects = [];
        
        // Create a ring of stones around the firepit
        const stoneRingRadius = 35;
        const stoneCount = 8;
        for (let i = 0; i < stoneCount; i++) {
            const angle = (i / stoneCount) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * stoneRingRadius;
            const y = centerY + Math.sin(angle) * stoneRingRadius;
            
            // Use smaller rocks for the ring
            const stone = this.factory.createObject(x, y, 'rock', 25);
            objects.push(stone);
        }
        
        // Firepit in center
        const firepit = this.factory.createObject(centerX, centerY, 'firepit', 45);
        objects.push(firepit);
        
        // Add seating rocks around it (4-6 rocks at varying distances)
        const rockCount = Utils.randomInt(4, 6);
        for (let i = 0; i < rockCount; i++) {
            const angle = (i / rockCount) * Math.PI * 2 + Math.random() * 0.3;
            const distance = Utils.random(radius * 0.7, radius * 1.1);
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            // Larger rocks for seating
            const rock = this.factory.createObject(x, y, 'rock', Utils.randomInt(35, 45));
            objects.push(rock);
        }
        
        return objects;
    }

    // Generate a well
    generateWell(centerX, centerY, size = 45) {
        const well = this.factory.createObject(centerX, centerY, 'well', size);
        return [well];
    }

    // Generate a fence segment
    generateFenceSegment(startX, startY, endX, endY, spacing = 20) {
        const fencePosts = [];
        const distance = Utils.distance(startX, startY, endX, endY);
        const numPosts = Math.floor(distance / spacing);
        const angle = Math.atan2(endY - startY, endX - startX);
        
        for (let i = 0; i <= numPosts; i++) {
            const t = i / numPosts;
            const x = startX + (endX - startX) * t;
            const y = startY + (endY - startY) * t;
            
            const post = this.factory.createObject(x, y, 'fence');
            fencePosts.push(post);
        }
        
        return fencePosts;
    }

    // Generate a fenced area (rectangular)
    generateFencedArea(centerX, centerY, width, height) {
        const objects = [];
        const halfW = width / 2;
        const halfH = height / 2;
        const spacing = 20;
        
        // Top fence
        objects.push(...this.generateFenceSegment(
            centerX - halfW, centerY - halfH,
            centerX + halfW, centerY - halfH,
            spacing
        ));
        
        // Bottom fence
        objects.push(...this.generateFenceSegment(
            centerX - halfW, centerY + halfH,
            centerX + halfW, centerY + halfH,
            spacing
        ));
        
        // Left fence
        objects.push(...this.generateFenceSegment(
            centerX - halfW, centerY - halfH,
            centerX - halfW, centerY + halfH,
            spacing
        ));
        
        // Right fence
        objects.push(...this.generateFenceSegment(
            centerX + halfW, centerY - halfH,
            centerX + halfW, centerY + halfH,
            spacing
        ));
        
        return objects;
    }

    // Generate decorative barrels/crates
    generateStorageArea(centerX, centerY, count = 3, radius = 40) {
        const objects = [];
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Utils.random(0, radius);
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            const barrel = this.factory.createObject(x, y, 'barrel');
            objects.push(barrel);
        }
        
        return objects;
    }

    // Generate a forest clearing (trees around an open area)
    generateClearing(centerX, centerY, clearingRadius = 100, treeRingRadius = 150, treeCount = 12) {
        const trees = [];
        
        // Place trees in a ring around the clearing
        for (let i = 0; i < treeCount; i++) {
            const angle = (i / treeCount) * Math.PI * 2;
            const distance = Utils.random(treeRingRadius, treeRingRadius + 50);
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            const tree = this.factory.createObject(x, y, 'tree');
            trees.push(tree);
        }
        
        return trees;
    }

    // Enhanced settlement generator with all features
    generateSettlement(centerX, centerY, houseCount = 3, radius = 200) {
        const structures = [];
        
        // Generate houses
        for (let i = 0; i < houseCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Utils.random(radius * 0.3, radius);
            const houseX = centerX + Math.cos(angle) * distance;
            const houseY = centerY + Math.sin(angle) * distance;
            
            const houseSize = Utils.randomInt(160, 240);
            const houseObjects = this.generateHouse(houseX, houseY, houseSize);
            structures.push(...houseObjects);
            
            // Add a shed near some houses (50% chance)
            if (Math.random() < 0.5) {
                const shedAngle = angle + Utils.random(-Math.PI/3, Math.PI/3);
                const shedDistance = houseSize / 2 + 40;
                const shedX = houseX + Math.cos(shedAngle) * shedDistance;
                const shedY = houseY + Math.sin(shedAngle) * shedDistance;
                
                const shedObjects = this.generateShed(shedX, shedY);
                structures.push(...shedObjects);
            }
        }
        
        // Add a central firepit (gathering area)
        const firepitObjects = this.generateFirepit(centerX, centerY, 120);
        structures.push(...firepitObjects);
        
        // Add a well (water source) - offset from center
        const wellAngle = Math.random() * Math.PI * 2;
        const wellDistance = radius * 0.4;
        const wellX = centerX + Math.cos(wellAngle) * wellDistance;
        const wellY = centerY + Math.sin(wellAngle) * wellDistance;
        const wellObjects = this.generateWell(wellX, wellY);
        structures.push(...wellObjects);
        
        // Add some storage areas (barrels/crates) near houses
        const storageCount = Math.floor(houseCount * 0.7);
        for (let i = 0; i < storageCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Utils.random(radius * 0.5, radius * 0.8);
            const storageX = centerX + Math.cos(angle) * distance;
            const storageY = centerY + Math.sin(angle) * distance;
            
            const storageObjects = this.generateStorageArea(storageX, storageY, Utils.randomInt(2, 4));
            structures.push(...storageObjects);
        }
        
        // Optionally add a fenced area (garden/pasture) - 30% chance
        if (Math.random() < 0.3) {
            const fenceAngle = Math.random() * Math.PI * 2;
            const fenceDistance = radius * 0.6;
            const fenceX = centerX + Math.cos(fenceAngle) * fenceDistance;
            const fenceY = centerY + Math.sin(fenceAngle) * fenceDistance;
            
            const fencedArea = this.generateFencedArea(fenceX, fenceY, 120, 100);
            structures.push(...fencedArea);
        }
        
        return structures;
    }
}

// Manager for all obstacles
class ObstacleManager {
    constructor() {
        this.obstacles = [];
        this.loadedSprites = new Map();
        this.factory = new ObjectFactory();
    }

    init(systems) {
        this.systems = systems;
    }

    addObstacle(x, y, width, height, type, spritePath = null, customProps = null) {
        const obstacle = new Obstacle(x, y, width, height, type);
        if (spritePath) {
            obstacle.spritePath = spritePath;
            this.loadSprite(spritePath);
        }
        // Copy custom properties if provided
        if (customProps) {
            Object.assign(obstacle, customProps);
        }
        this.obstacles.push(obstacle);
        return obstacle;
    }

    createObject(x, y, type = 'tree', customSize = null, spritePath = null) {
        const objData = this.factory.createObject(x, y, type, customSize, spritePath);
        return this.addObstacle(objData.x, objData.y, objData.width, objData.height, objData.type, objData.spritePath);
    }

    loadSprite(path) {
        if (this.loadedSprites.has(path)) {
            return this.loadedSprites.get(path);
        }
        
        const img = new Image();
        img.src = path;
        this.loadedSprites.set(path, img);
        return img;
    }

    canMoveTo(x, y, entityWidth, entityHeight) {
        for (const obstacle of this.obstacles) {
            if (Utils.rectCollision(
                x - entityWidth/2, y - entityHeight/2, entityWidth, entityHeight,
                obstacle.x, obstacle.y, obstacle.width, obstacle.height
            )) {
                return false;
            }
        }
        return true;
    }

    wouldOverlap(x, y, width, height) {
        for (const obstacle of this.obstacles) {
            if (Utils.rectCollision(
                x, y, width, height,
                obstacle.x, obstacle.y, obstacle.width, obstacle.height
            )) {
                return true;
            }
        }
        return false;
    }

    generateForest(worldWidth, worldHeight, density = 0.02) {
        const tileSize = GameConfig.world.tileSize;
        const numTrees = Math.floor(worldWidth * worldHeight * density / (tileSize * tileSize));
        const config = this.factory.getConfig('tree');
        
        const excludeArea = {
            x: worldWidth / 2,
            y: worldHeight / 2,
            radius: 200
        };
        
        let treesPlaced = 0;
        let attempts = 0;
        const maxAttempts = numTrees * 3;
        
        while (treesPlaced < numTrees && attempts < maxAttempts) {
            attempts++;
            
            const x = Utils.randomInt(0, worldWidth - config.maxSize);
            const y = Utils.randomInt(0, worldHeight - config.maxSize);
            
            const distFromCenter = Utils.distance(x, y, excludeArea.x, excludeArea.y);
            if (distFromCenter < excludeArea.radius) {
                continue;
            }
            
            const obj = this.factory.createObject(x, y, 'tree');
            
            if (!this.wouldOverlap(obj.x, obj.y, obj.width, obj.height)) {
                this.addObstacle(obj.x, obj.y, obj.width, obj.height, obj.type, obj.spritePath);
                treesPlaced++;
            }
        }
    }

    generateRocks(worldWidth, worldHeight, density = 0.015) {
        const tileSize = GameConfig.world.tileSize;
        const numRocks = Math.floor(worldWidth * worldHeight * density / (tileSize * tileSize));
        const config = this.factory.getConfig('rock');
        
        const excludeArea = {
            x: worldWidth / 2,
            y: worldHeight / 2,
            radius: 200
        };
        
        let rocksPlaced = 0;
        let attempts = 0;
        const maxAttempts = numRocks * 3;
        
        while (rocksPlaced < numRocks && attempts < maxAttempts) {
            attempts++;
            
            const x = Utils.randomInt(0, worldWidth - config.maxSize);
            const y = Utils.randomInt(0, worldHeight - config.maxSize);
            
            const distFromCenter = Utils.distance(x, y, excludeArea.x, excludeArea.y);
            if (distFromCenter < excludeArea.radius) {
                continue;
            }
            
            const obj = this.factory.createObject(x, y, 'rock');
            
            if (!this.wouldOverlap(obj.x, obj.y, obj.width, obj.height)) {
                this.addObstacle(obj.x, obj.y, obj.width, obj.height, obj.type, obj.spritePath);
                rocksPlaced++;
            }
        }
    }

    generateBorderTrees(worldWidth, worldHeight, spacing = 50) {
        const treeObjects = this.factory.createObjectsAlongBorder(
            worldWidth, worldHeight, 'tree', spacing, 'all'
        );
        
        treeObjects.forEach(obj => {
            this.addObstacle(obj.x, obj.y, obj.width, obj.height, obj.type, obj.spritePath);
        });
    }

    generateHouses(worldWidth, worldHeight, count = 5) {
        const excludeArea = {
            x: worldWidth / 2,
            y: worldHeight / 2,
            radius: 300
        };
        
        const generator = new StructureGenerator(this);
        let housesPlaced = 0;
        let attempts = 0;
        const maxAttempts = count * 5;
        
        while (housesPlaced < count && attempts < maxAttempts) {
            attempts++;
            
            const x = Utils.randomInt(200, worldWidth - 200);
            const y = Utils.randomInt(200, worldHeight - 200);
            
            const distFromCenter = Utils.distance(x, y, excludeArea.x, excludeArea.y);
            if (distFromCenter < excludeArea.radius) {
                continue;
            }
            
            // Check if area is clear
            const houseSize = 240;
            if (!this.wouldOverlap(x - houseSize/2, y - houseSize/2, houseSize, houseSize)) {
                const houseObjects = generator.generateHouse(x, y, houseSize);
                
                // Add all house components
                let canPlace = true;
                for (const obj of houseObjects) {
                    if (this.wouldOverlap(obj.x, obj.y, obj.width, obj.height)) {
                        canPlace = false;
                        break;
                    }
                }
                
                if (canPlace) {
                    houseObjects.forEach(obj => {
                        this.addObstacle(obj.x, obj.y, obj.width, obj.height, obj.type, obj.spritePath);
                    });
                    housesPlaced++;
                }
            }
        }
    }

    generateWoodClusters(worldWidth, worldHeight, clusterCount = 4, treesPerCluster = 8) {
        const excludeArea = {
            x: worldWidth / 2,
            y: worldHeight / 2,
            radius: 250
        };
        
        const generator = new StructureGenerator(this);
        let clustersPlaced = 0;
        let attempts = 0;
        const maxAttempts = clusterCount * 5;
        
        while (clustersPlaced < clusterCount && attempts < maxAttempts) {
            attempts++;
            
            const x = Utils.randomInt(150, worldWidth - 150);
            const y = Utils.randomInt(150, worldHeight - 150);
            
            const distFromCenter = Utils.distance(x, y, excludeArea.x, excludeArea.y);
            if (distFromCenter < excludeArea.radius) {
                continue;
            }
            
            const clusterRadius = 150;
            const trees = generator.generateWoodCluster(x, y, clusterRadius, treesPerCluster);
            
            // Try to place all trees
            let treesPlaced = 0;
            for (const tree of trees) {
                if (!this.wouldOverlap(tree.x, tree.y, tree.width, tree.height)) {
                    this.addObstacle(tree.x, tree.y, tree.width, tree.height, tree.type, tree.spritePath);
                    treesPlaced++;
                }
            }
            
            if (treesPlaced >= treesPerCluster * 0.6) { // At least 60% success
                clustersPlaced++;
            }
        }
    }

    generateSettlements(worldWidth, worldHeight, settlementCount = 2) {
        const excludeArea = {
            x: worldWidth / 2,
            y: worldHeight / 2,
            radius: 400
        };
        
        const generator = new StructureGenerator(this);
        let settlementsPlaced = 0;
        let attempts = 0;
        const maxAttempts = settlementCount * 5;
        
        while (settlementsPlaced < settlementCount && attempts < maxAttempts) {
            attempts++;
            
            const x = Utils.randomInt(300, worldWidth - 300);
            const y = Utils.randomInt(300, worldHeight - 300);
            
            const distFromCenter = Utils.distance(x, y, excludeArea.x, excludeArea.y);
            if (distFromCenter < excludeArea.radius) {
                continue;
            }
            
            const settlementRadius = 200;
            const structures = generator.generateSettlement(x, y, 3, settlementRadius);
            
            // Check if we can place the settlement
            let canPlace = true;
            for (const obj of structures) {
                if (this.wouldOverlap(obj.x, obj.y, obj.width, obj.height)) {
                    canPlace = false;
                    break;
                }
            }
            
            if (canPlace) {
                structures.forEach(obj => {
                    this.addObstacle(obj.x, obj.y, obj.width, obj.height, obj.type, obj.spritePath);
                });
                settlementsPlaced++;
            }
        }
    }

    generateFirepits(worldWidth, worldHeight, count = 3) {
        const excludeArea = {
            x: worldWidth / 2,
            y: worldHeight / 2,
            radius: 250
        };
        
        const generator = new StructureGenerator(this);
        let firepitsPlaced = 0;
        let attempts = 0;
        const maxAttempts = count * 5;
        
        while (firepitsPlaced < count && attempts < maxAttempts) {
            attempts++;
            
            const x = Utils.randomInt(100, worldWidth - 100);
            const y = Utils.randomInt(100, worldHeight - 100);
            
            const distFromCenter = Utils.distance(x, y, excludeArea.x, excludeArea.y);
            if (distFromCenter < excludeArea.radius) {
                continue;
            }
            
            const firepitObjects = generator.generateFirepit(x, y);
            
            let canPlace = true;
            for (const obj of firepitObjects) {
                if (this.wouldOverlap(obj.x, obj.y, obj.width, obj.height)) {
                    canPlace = false;
                    break;
                }
            }
            
            if (canPlace) {
                firepitObjects.forEach(obj => {
                    this.addObstacle(obj.x, obj.y, obj.width, obj.height, obj.type, obj.spritePath);
                });
                firepitsPlaced++;
            }
        }
    }

    generateSheds(worldWidth, worldHeight, count = 4) {
        const excludeArea = {
            x: worldWidth / 2,
            y: worldHeight / 2,
            radius: 250
        };
        
        const generator = new StructureGenerator(this);
        let shedsPlaced = 0;
        let attempts = 0;
        const maxAttempts = count * 5;
        
        while (shedsPlaced < count && attempts < maxAttempts) {
            attempts++;
            
            const x = Utils.randomInt(50, worldWidth - 50);
            const y = Utils.randomInt(50, worldHeight - 50);
            
            const distFromCenter = Utils.distance(x, y, excludeArea.x, excludeArea.y);
            if (distFromCenter < excludeArea.radius) {
                continue;
            }
            
            const shedSize = Utils.randomInt(100, 140);
            if (!this.wouldOverlap(x - shedSize/2, y - shedSize/2, shedSize, shedSize)) {
                const shedObjects = generator.generateShed(x, y, shedSize);
                shedObjects.forEach(obj => {
                    this.addObstacle(obj.x, obj.y, obj.width, obj.height, obj.type, obj.spritePath);
                });
                shedsPlaced++;
            }
        }
    }

    generateWells(worldWidth, worldHeight, count = 2) {
        const excludeArea = {
            x: worldWidth / 2,
            y: worldHeight / 2,
            radius: 250
        };
        
        const generator = new StructureGenerator(this);
        let wellsPlaced = 0;
        let attempts = 0;
        const maxAttempts = count * 5;
        
        while (wellsPlaced < count && attempts < maxAttempts) {
            attempts++;
            
            const x = Utils.randomInt(50, worldWidth - 50);
            const y = Utils.randomInt(50, worldHeight - 50);
            
            const distFromCenter = Utils.distance(x, y, excludeArea.x, excludeArea.y);
            if (distFromCenter < excludeArea.radius) {
                continue;
            }
            
            if (!this.wouldOverlap(x - 25, y - 25, 50, 50)) {
                const wellObjects = generator.generateWell(x, y);
                wellObjects.forEach(obj => {
                    this.addObstacle(obj.x, obj.y, obj.width, obj.height, obj.type, obj.spritePath);
                });
                wellsPlaced++;
            }
        }
    }

    generateWorld(worldWidth, worldHeight, config) {
        this.generateBorderTrees(worldWidth, worldHeight, config.border.spacing);
        this.generateForest(worldWidth, worldHeight, config.forest.density);
        this.generateRocks(worldWidth, worldHeight, config.rocks.density);
        
        // Add new structure generation
        if (config.structures) {
            if (config.structures.houses && config.structures.houses.enabled) {
                this.generateHouses(worldWidth, worldHeight, config.structures.houses.count);
            }
            if (config.structures.woodClusters && config.structures.woodClusters.enabled) {
                this.generateWoodClusters(
                    worldWidth, 
                    worldHeight, 
                    config.structures.woodClusters.count,
                    config.structures.woodClusters.treesPerCluster
                );
            }
            if (config.structures.settlements && config.structures.settlements.enabled) {
                this.generateSettlements(worldWidth, worldHeight, config.structures.settlements.count);
            }
            if (config.structures.firepits && config.structures.firepits.enabled) {
                this.generateFirepits(worldWidth, worldHeight, config.structures.firepits.count);
            }
            if (config.structures.sheds && config.structures.sheds.enabled) {
                this.generateSheds(worldWidth, worldHeight, config.structures.sheds.count);
            }
            if (config.structures.wells && config.structures.wells.enabled) {
                this.generateWells(worldWidth, worldHeight, config.structures.wells.count);
            }
        }
    }
}

