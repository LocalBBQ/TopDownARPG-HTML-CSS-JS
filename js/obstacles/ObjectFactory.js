// Object Factory - defines configurations for different object types
class ObjectFactory {
    constructor() {
        this.configs = {
            tree: { minSize: 30, maxSize: 90, defaultSpritePath: 'assets/sprites/environment/Trees.png', color: '#2d5016' },
            rock: { minSize: 30, maxSize: 50, defaultSpritePath: 'assets/rock.png', color: '#555555' },
            bush: { minSize: 25, maxSize: 35, defaultSpritePath: 'assets/bush.png', color: '#3a5a2a' },
            house: { minSize: 160, maxSize: 240, defaultSpritePath: 'assets/house.png', color: '#8b4513' },
            wall: { minSize: 20, maxSize: 20, defaultSpritePath: 'assets/wall.png', color: '#696969' },
            door: { minSize: 60, maxSize: 80, defaultSpritePath: 'assets/door.png', color: '#654321' },
            shed: { minSize: 100, maxSize: 140, defaultSpritePath: 'assets/shed.png', color: '#654321' },
            firepit: { minSize: 30, maxSize: 40, defaultSpritePath: 'assets/firepit.png', color: '#ff6600' },
            well: { minSize: 40, maxSize: 50, defaultSpritePath: 'assets/well.png', color: '#888888' },
            fence: { minSize: 15, maxSize: 20, defaultSpritePath: 'assets/fence.png', color: '#8b7355' },
            barrel: { minSize: 25, maxSize: 35, defaultSpritePath: 'assets/barrel.png', color: '#4a4a4a' },
            pillar: { minSize: 35, maxSize: 55, defaultSpritePath: 'assets/pillar.png', color: '#6b6b6b' },
            brokenPillar: { minSize: 40, maxSize: 70, defaultSpritePath: 'assets/broken_pillar.png', color: '#5a5a5a' },
            rubble: { minSize: 25, maxSize: 45, defaultSpritePath: 'assets/rubble.png', color: '#4a4a4a' },
            crumblingWall: { minSize: 20, maxSize: 35, defaultSpritePath: 'assets/crumbling_wall.png', color: '#5c5c5c' },
            arch: { minSize: 60, maxSize: 90, defaultSpritePath: 'assets/arch.png', color: '#636363' },
            statueBase: { minSize: 45, maxSize: 65, defaultSpritePath: 'assets/statue_base.png', color: '#707070' },
            column: { minSize: 30, maxSize: 50, defaultSpritePath: 'assets/column.png', color: '#656565' },
            stoneDebris: { minSize: 18, maxSize: 32, defaultSpritePath: 'assets/stone_debris.png', color: '#555555' },
            mushroom: { minSize: 13, maxSize: 85, defaultSpritePath: null, color: '#3d3028' },
            grave: { minSize: 28, maxSize: 42, defaultSpritePath: null, color: '#4a4845' },
            swampPool: { minSize: 50, maxSize: 90, defaultSpritePath: null, color: '#1a2e2a' },
            darkRock: { minSize: 28, maxSize: 48, defaultSpritePath: null, color: '#3a3835' },
            lavaRock: { minSize: 32, maxSize: 55, defaultSpritePath: null, color: '#4a2520' },
            demonPillar: { minSize: 38, maxSize: 58, defaultSpritePath: null, color: '#2a1518' },
            brazier: { minSize: 35, maxSize: 50, defaultSpritePath: null, color: '#5c3020' }
        };
    }

    getConfig(type) {
        return this.configs[type] || this.configs.tree;
    }

    createObject(x, y, type = 'tree', customSize = null, spritePath = null) {
        const config = this.getConfig(type);
        const size = customSize || Utils.randomInt(config.minSize, config.maxSize);
        const path = spritePath || config.defaultSpritePath;
        return { x, y, width: size, height: size, type, spritePath: path, color: config.color };
    }

    createObjectsInArea(startX, startY, endX, endY, type, count, excludeArea = null) {
        const objects = [];
        const config = this.getConfig(type);
        for (let i = 0; i < count; i++) {
            let x, y, attempts = 0;
            const maxAttempts = 100;
            do {
                x = Utils.randomInt(startX, endX - config.maxSize);
                y = Utils.randomInt(startY, endY - config.maxSize);
                attempts++;
            } while (excludeArea && Utils.distance(x, y, excludeArea.x, excludeArea.y) < excludeArea.radius && attempts < maxAttempts);
            if (attempts < maxAttempts) objects.push(this.createObject(x, y, type));
        }
        return objects;
    }

    createObjectsAlongBorder(worldWidth, worldHeight, type, spacing, border = 'all') {
        const objects = [];
        const config = this.getConfig(type);
        const maxSize = config.maxSize;
        if (border === 'all' || border === 'top') {
            for (let x = 0; x < worldWidth; x += spacing) objects.push(this.createObject(x, 0, type));
        }
        if (border === 'all' || border === 'bottom') {
            for (let x = 0; x < worldWidth; x += spacing) objects.push(this.createObject(x, worldHeight - maxSize, type));
        }
        if (border === 'all' || border === 'left') {
            for (let y = spacing; y < worldHeight - spacing; y += spacing) objects.push(this.createObject(0, y, type));
        }
        if (border === 'all' || border === 'right') {
            for (let y = spacing; y < worldHeight - spacing; y += spacing) objects.push(this.createObject(worldWidth - maxSize, y, type));
        }
        return objects;
    }
}

if (typeof window !== 'undefined') {
    window.ObjectFactory = ObjectFactory;
}
