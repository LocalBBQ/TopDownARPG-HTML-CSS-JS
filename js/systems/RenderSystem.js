// Render System - handles all rendering
class RenderSystem {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        // Optional runtime settings injected by Game (see Game.initSystems)
        this.settings = null;
    }

    init(systems) {
        this.systems = systems;
    }

    clear() {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderWorld(camera, obstacleManager, currentLevel = 1, worldWidth = null, worldHeight = null) {
        const isHub = currentLevel === 0;
        const tileSize = isHub && GameConfig.hub.tileSize ? GameConfig.hub.tileSize : GameConfig.world.tileSize;
        const effectiveWidth = this.canvas.width / camera.zoom;
        const effectiveHeight = this.canvas.height / camera.zoom;
        let startX = Math.floor(camera.x / tileSize) * tileSize;
        let startY = Math.floor(camera.y / tileSize) * tileSize;
        let endX = camera.x + effectiveWidth + tileSize;
        let endY = camera.y + effectiveHeight + tileSize;
        if (isHub && worldWidth != null && worldHeight != null) {
            startX = Math.max(0, startX);
            startY = Math.max(0, startY);
            endX = Math.min(worldWidth, endX);
            endY = Math.min(worldHeight, endY);
        }

        const levelConfig = isHub ? GameConfig.hub : (GameConfig.levels && GameConfig.levels[currentLevel]);
        const theme = levelConfig && levelConfig.theme ? levelConfig.theme : null;
        const ground = theme && theme.ground ? theme.ground : { r: 30, g: 50, b: 30, variation: 18 };

        const useEnvironmentSprites = !this.settings || this.settings.useEnvironmentSprites !== false;
        const spriteManager = this.systems && this.systems.get ? this.systems.get('sprites') : null;
        const groundImage = useEnvironmentSprites && ground.texture && spriteManager && spriteManager.getGroundTexture ? spriteManager.getGroundTexture(ground.texture) : null;
        const tileScreenSize = tileSize * camera.zoom;

        const useTexture = groundImage && groundImage.complete && groundImage.naturalWidth > 0;
        if (useTexture) {
            this.ctx.imageSmoothingEnabled = false;
        }

        for (let x = startX; x < endX; x += tileSize) {
            for (let y = startY; y < endY; y += tileSize) {
                const screenX = camera.toScreenX(x);
                const screenY = camera.toScreenY(y);
                if (useTexture) {
                    this.ctx.drawImage(groundImage, 0, 0, groundImage.naturalWidth, groundImage.naturalHeight, screenX, screenY, tileScreenSize, tileScreenSize);
                } else {
                    const v = Math.floor((x + y) % 3) * (ground.variation || 15);
                    const r = Math.max(0, Math.min(255, ground.r + v));
                    const gVal = Math.max(0, Math.min(255, ground.g + v));
                    const b = Math.max(0, Math.min(255, ground.b + v));
                    this.ctx.fillStyle = `rgb(${r}, ${gVal}, ${b})`;
                    this.ctx.fillRect(screenX, screenY, tileScreenSize, tileScreenSize);
                }
            }
        }

        if (useTexture) {
            this.ctx.imageSmoothingEnabled = true;
        }

        if (obstacleManager) {
            this.renderObstacles(obstacleManager, camera, currentLevel);
        }
    }

    renderObstacles(obstacleManager, camera, currentLevel = 1) {
        const zoom = camera.zoom;
        const useEnvironmentSprites = !this.settings || this.settings.useEnvironmentSprites !== false;
        for (const obstacle of obstacleManager.obstacles) {
            const screenX = camera.toScreenX(obstacle.x);
            const screenY = camera.toScreenY(obstacle.y);
            const w = obstacle.width * zoom;
            const h = obstacle.height * zoom;

            if (screenX > -w && screenX < this.canvas.width + w && screenY > -h && screenY < this.canvas.height + h) {
                if (useEnvironmentSprites && obstacle.spritePath && obstacleManager.loadedSprites.has(obstacle.spritePath)) {
                    const sprite = obstacleManager.loadedSprites.get(obstacle.spritePath);
                    if (sprite.complete && sprite.naturalWidth > 0) {
                        // Trees.png is a 3-frame horizontal strip: draw one frame when spriteFrameIndex is set
                        const frameIndex = obstacle.spriteFrameIndex;
                        if (typeof frameIndex === 'number' && frameIndex >= 0 && (obstacle.spritePath || '').includes('Trees.png')) {
                            const numFrames = 3;
                            const frameW = sprite.naturalWidth / numFrames;
                            const frameH = sprite.naturalHeight;
                            const sx = Math.min(frameIndex, numFrames - 1) * frameW;
                            this.ctx.drawImage(sprite, sx, 0, frameW, frameH, screenX, screenY, w, h);
                        } else {
                            this.ctx.drawImage(sprite, screenX, screenY, w, h);
                        }
                        continue;
                    }
                }

                const cx = screenX + w / 2;
                const cy = screenY + h / 2;
                const color = obstacle.color || '#555';

                if (obstacle.type === 'tree') {
                    this.ctx.fillStyle = '#4a2c1a';
                    this.ctx.fillRect(screenX + w * 0.4, screenY + h * 0.6, w * 0.2, h * 0.4);
                    this.ctx.fillStyle = '#2d5016';
                    this.ctx.beginPath();
                    this.ctx.arc(cx, screenY + h * 0.4, w * 0.4, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (obstacle.type === 'mushroom') {
                    this.ctx.fillStyle = '#2a221c';
                    if (obstacle.leafless) {
                        this.ctx.fillRect(screenX + w * 0.41, screenY + h * 0.3, w * 0.18, h * 0.7);
                    } else {
                        this.ctx.fillRect(screenX + w * 0.35, screenY + h * 0.3, w * 0.3, h * 0.7);
                    }
                    if (obstacle.leafless) {
                        this.ctx.strokeStyle = '#2a221c';
                        this.ctx.lineWidth = Math.max(2, 5 / zoom);
                        this.ctx.lineCap = 'round';
                        const topX = cx;
                        const topY = screenY + h * 0.32;
                        const v = (obstacle.leaflessVariant ?? 0) % 3;
                        this.ctx.beginPath();
                        if (v === 0) {
                            this.ctx.moveTo(topX, topY);
                            this.ctx.lineTo(topX - w * 0.38, topY - h * 0.22);
                            this.ctx.moveTo(topX, topY);
                            this.ctx.lineTo(topX + w * 0.35, topY - h * 0.18);
                            this.ctx.moveTo(topX, topY);
                            this.ctx.lineTo(topX - w * 0.15, topY - h * 0.38);
                            this.ctx.moveTo(topX, topY);
                            this.ctx.lineTo(topX + w * 0.4, topY - h * 0.12);
                        } else if (v === 1) {
                            this.ctx.moveTo(topX, topY);
                            this.ctx.lineTo(topX - w * 0.42, topY - h * 0.08);
                            this.ctx.moveTo(topX, topY);
                            this.ctx.lineTo(topX + w * 0.28, topY - h * 0.28);
                            this.ctx.moveTo(topX, topY);
                            this.ctx.lineTo(topX - w * 0.08, topY - h * 0.4);
                            this.ctx.moveTo(topX, topY);
                            this.ctx.lineTo(topX + w * 0.38, topY - h * 0.15);
                            this.ctx.moveTo(topX, topY);
                            this.ctx.lineTo(topX + w * 0.12, topY - h * 0.35);
                        } else {
                            this.ctx.moveTo(topX, topY);
                            this.ctx.lineTo(topX - w * 0.35, topY - h * 0.32);
                            this.ctx.moveTo(topX, topY);
                            this.ctx.lineTo(topX + w * 0.4, topY - h * 0.25);
                            this.ctx.moveTo(topX, topY);
                            this.ctx.lineTo(topX - w * 0.22, topY - h * 0.12);
                            this.ctx.moveTo(topX, topY);
                            this.ctx.lineTo(topX + w * 0.18, topY - h * 0.38);
                        }
                        this.ctx.stroke();
                    } else {
                        this.ctx.fillStyle = '#3d3028';
                        this.ctx.beginPath();
                        this.ctx.ellipse(cx, screenY + h * 0.35, w * 0.42, h * 0.3, 0, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.strokeStyle = '#2a221c';
                        this.ctx.lineWidth = 2 / zoom;
                        this.ctx.stroke();
                    }
                } else if (obstacle.type === 'grave') {
                    this.ctx.fillStyle = '#3a3835';
                    this.ctx.fillRect(screenX, screenY + h * 0.2, w, h * 0.6);
                    this.ctx.fillStyle = '#4a4845';
                    this.ctx.fillRect(screenX + w * 0.15, screenY, w * 0.2, h * 0.85);
                    this.ctx.fillRect(screenX + w * 0.4, screenY + h * 0.4, w * 0.2, h * 0.45);
                } else if (obstacle.type === 'swampPool') {
                    const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) / 2);
                    grad.addColorStop(0, 'rgba(25, 55, 50, 0.85)');
                    grad.addColorStop(0.7, 'rgba(20, 45, 42, 0.75)');
                    grad.addColorStop(1, 'rgba(15, 35, 32, 0.6)');
                    this.ctx.fillStyle = grad;
                    this.ctx.beginPath();
                    this.ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.strokeStyle = 'rgba(30, 60, 55, 0.9)';
                    this.ctx.lineWidth = 2 / zoom;
                    this.ctx.stroke();
                } else if (obstacle.type === 'demonPillar') {
                    this.ctx.fillStyle = '#1a0e10';
                    this.ctx.fillRect(screenX + w * 0.2, screenY, w * 0.6, h);
                    this.ctx.fillStyle = '#2a1518';
                    this.ctx.fillRect(screenX, screenY + h * 0.7, w, h * 0.3);
                    this.ctx.fillStyle = 'rgba(80, 20, 25, 0.6)';
                    this.ctx.fillRect(screenX + w * 0.25, screenY, w * 0.5, h * 0.15);
                } else if (obstacle.type === 'brazier') {
                    this.ctx.fillStyle = '#3d2518';
                    this.ctx.fillRect(screenX + w * 0.2, screenY + h * 0.5, w * 0.6, h * 0.5);
                    this.ctx.fillStyle = '#5c3020';
                    this.ctx.beginPath();
                    this.ctx.ellipse(cx, screenY + h * 0.35, w * 0.35, h * 0.25, 0, 0, Math.PI * 2);
                    this.ctx.fill();
                    const t = performance.now() * 0.003;
                    const glow = 0.7 + 0.3 * Math.sin(t);
                    this.ctx.fillStyle = `rgba(255, 120, 40, ${0.4 * glow})`;
                    this.ctx.beginPath();
                    this.ctx.ellipse(cx, screenY + h * 0.3, w * 0.25, h * 0.2, 0, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.fillStyle = `rgba(255, 180, 80, ${0.6 * glow})`;
                    this.ctx.beginPath();
                    this.ctx.ellipse(cx, screenY + h * 0.28, w * 0.12, h * 0.1, 0, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (obstacle.type === 'lavaRock') {
                    this.ctx.fillStyle = obstacle.color || '#4a2520';
                    this.ctx.fillRect(screenX, screenY, w, h);
                    this.ctx.fillStyle = 'rgba(180, 60, 30, 0.35)';
                    this.ctx.fillRect(screenX + w * 0.1, screenY + h * 0.1, w * 0.5, h * 0.4);
                } else {
                    this.ctx.fillStyle = color;
                    this.ctx.fillRect(screenX, screenY, w, h);
                }
            }
        }
    }

    renderPortal(portal, camera) {
        if (!portal || !portal.spawned) return;
        const screenX = camera.toScreenX(portal.x);
        const screenY = camera.toScreenY(portal.y);
        const w = portal.width * camera.zoom;
        const h = portal.height * camera.zoom;
        if (screenX + w < 0 || screenX > this.canvas.width || screenY + h < 0 || screenY > this.canvas.height) return;
        const cx = screenX + w / 2;
        const cy = screenY + h / 2;
        const time = performance.now() * 0.002;
        const pulse = 0.85 + 0.15 * Math.sin(time);
        const r = Math.min(w, h) * 0.45 * pulse;
        const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, 'rgba(120, 80, 255, 0.9)');
        gradient.addColorStop(0.5, 'rgba(80, 40, 200, 0.6)');
        gradient.addColorStop(1, 'rgba(40, 20, 120, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.ellipse(cx, cy, r, r * 1.2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(180, 140, 255, 0.8)';
        this.ctx.lineWidth = 3 / camera.zoom;
        this.ctx.stroke();
    }

    renderPortalInteractionPrompt(portal, camera, playerNearPortal) {
        if (!portal || !portal.spawned || !playerNearPortal) return;
        const screenX = camera.toScreenX(portal.x);
        const screenY = camera.toScreenY(portal.y);
        const w = portal.width * camera.zoom;
        const h = portal.height * camera.zoom;
        if (screenX + w < 0 || screenX > this.canvas.width || screenY + h < 0 || screenY > this.canvas.height) return;
        
        const cx = screenX + w / 2;
        const cy = screenY + h / 2;
        const promptY = cy - h / 2 - 30; // Position above the portal
        
        // Draw background for text (semi-transparent dark background)
        const text = 'Press E to interact';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const textMetrics = this.ctx.measureText(text);
        const padding = 12;
        const bgWidth = textMetrics.width + padding * 2;
        const bgHeight = 28;
        const bgX = cx - bgWidth / 2;
        const bgY = promptY - bgHeight / 2;
        
        // Draw background with rounded corners effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
        this.ctx.strokeStyle = 'rgba(180, 140, 255, 0.9)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);
        
        // Draw text with shadow for visibility
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillText(text, cx + 1, promptY + 1);
        this.ctx.fillStyle = '#e8dcc8';
        this.ctx.fillText(text, cx, promptY);
    }

    renderBoard(board, camera) {
        if (!board) return;
        const screenX = camera.toScreenX(board.x);
        const screenY = camera.toScreenY(board.y);
        const w = board.width * camera.zoom;
        const h = board.height * camera.zoom;
        if (screenX + w < 0 || screenX > this.canvas.width || screenY + h < 0 || screenY > this.canvas.height) return;
        this.ctx.fillStyle = '#2a2418';
        this.ctx.fillRect(screenX, screenY, w, h);
        this.ctx.strokeStyle = '#c9a227';
        this.ctx.lineWidth = 3 / camera.zoom;
        this.ctx.strokeRect(screenX, screenY, w, h);
        this.ctx.strokeStyle = '#8b7355';
        this.ctx.lineWidth = 2 / camera.zoom;
        this.ctx.strokeRect(screenX + 4, screenY + 4, w - 8, h - 8);
        this.ctx.fillStyle = '#e8dcc8';
        this.ctx.font = '600 14px Cinzel, Georgia, serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('Level Board', screenX + w / 2, screenY + h / 2);
    }

    renderBoardInteractionPrompt(board, camera, playerNearBoard) {
        if (!board || !playerNearBoard) return;
        const screenX = camera.toScreenX(board.x);
        const screenY = camera.toScreenY(board.y);
        const w = board.width * camera.zoom;
        const h = board.height * camera.zoom;
        if (screenX + w < 0 || screenX > this.canvas.width || screenY + h < 0 || screenY > this.canvas.height) return;
        const cx = screenX + w / 2;
        const cy = screenY + h / 2;
        const promptY = cy - h / 2 - 28;
        const text = 'Press E to select level';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const textMetrics = this.ctx.measureText(text);
        const padding = 10;
        const bgWidth = textMetrics.width + padding * 2;
        const bgHeight = 24;
        const bgX = cx - bgWidth / 2;
        const bgY = promptY - bgHeight / 2;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
        this.ctx.strokeStyle = '#c9a227';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);
        this.ctx.fillStyle = '#e8dcc8';
        this.ctx.fillText(text, cx, promptY);
    }

    renderEntities(entities, camera) {
        const spriteManager = this.systems ? this.systems.get('sprites') : null;
        const useCharacterSprites = !this.settings || this.settings.useCharacterSprites !== false;
        
        for (const entity of entities) {
            if (!entity.active) continue;
            
            const transform = entity.getComponent(Transform);
            const renderable = entity.getComponent(Renderable);
            if (!transform || !renderable) continue;

            const screenX = camera.toScreenX(transform.x);
            const screenY = camera.toScreenY(transform.y);

            // Check if in view
            if (screenX < -50 || screenX > this.canvas.width + 50 ||
                screenY < -50 || screenY > this.canvas.height + 50) {
                continue;
            }

            // Try to render with sprite first (if enabled), otherwise fallback to type-based rendering
            const sprite = entity.getComponent(Sprite);
            const isCharacter = renderable.type === 'player' || renderable.type === 'enemy';

            try {
                if (sprite && spriteManager && (useCharacterSprites || !isCharacter)) {
                    this.renderSprite(entity, camera, screenX, screenY, spriteManager);
                } else {
                    // Render based on type (fallback, including when character sprites are disabled)
                    if (renderable.type === 'player') {
                        this.renderPlayer(entity, camera, screenX, screenY);
                    } else if (renderable.type === 'enemy') {
                        this.renderEnemy(entity, camera, screenX, screenY);
                    }
                }
            } catch (err) {
                console.warn('Render entity failed (skipping):', entity.id || renderable.type, err);
            }
        }
    }

    // Render entity using sprite
    renderSprite(entity, camera, screenX, screenY, spriteManager) {
        const transform = entity.getComponent(Transform);
        const sprite = entity.getComponent(Sprite);
        const animation = entity.getComponent(Animation);
        const movement = entity.getComponent(Movement);
        
        if (!sprite || !transform) return;

        const spriteSheet = sprite.getSpriteSheet(spriteManager, animation);
        const animSpriteSheetKey = animation ? animation.getCurrentSpriteSheetKey() : null;
        
        if (!spriteSheet || !spriteSheet.image) {
            // Fallback to renderable if sprite not loaded
            const renderable = entity.getComponent(Renderable);
            if (renderable) {
                if (renderable.type === 'player') {
                    this.renderPlayer(entity, camera, screenX, screenY);
                } else if (renderable.type === 'enemy') {
                    this.renderEnemy(entity, camera, screenX, screenY);
                }
            }
            return;
        }

        // Determine which frame to render
        let row = 0;
        let col = 0;

        if (animation && animation.currentAnimation) {
            // Use animation to determine frame
            const anim = animation.animations[animation.currentAnimation];
            if (anim && anim.frames) {
                // Get current frame index from animation
                const frameIndex = animation.getCurrentFrameIndex();
                
                // Convert frame index to row and column based on sprite sheet layout
                // Check if this animation uses direction-based selection (8 directions)
                if (anim.useDirection && movement) {
                    const direction = SpriteUtils.angleTo8Direction(movement.facingAngle);
                    // Knight_8_Direction.png column order: 0=South, 1=SE, 2=East, 3=NE, 4=North, 5=NW, 6=West, 7=SW
                    // Game order: 0=East, 1=SE, 2=South, 3=SW, 4=West, 5=NW, 6=North, 7=NE
                    const directionToFrame = [2, 1, 0, 7, 6, 5, 4, 3];
                    const frameDir = directionToFrame[direction];
                    if (anim.useDirectionAsColumn) {
                        // Horizontal strip: 1 row × 8 cols — direction is column
                        row = 0;
                        col = frameDir;
                    } else {
                        // Vertical strip: 8 rows × 1 col — direction is row, col is frame index
                        row = frameDir;
                        col = frameIndex;
                    }
                } else if (spriteSheet && spriteSheet.rows > 1) {
                    // Multi-row sprite sheet: calculate row and col from frame index
                    // For non-directional animations, frames are laid out left-to-right, top-to-bottom
                    row = Math.floor(frameIndex / spriteSheet.cols);
                    col = frameIndex % spriteSheet.cols;
                } else {
                    // Single-row sprite sheet: row is always 0, col is frame index
                    row = 0;
                    col = frameIndex;
                }
                
                // Debug log for first frame
                if (entity.id === 'player' && frameIndex === 0) {
                    console.log(`Animation: ${animation.currentAnimation}, frameIndex: ${frameIndex}, col: ${col}, frames array:`, anim.frames);
                }
            }
        } else if (movement) {
            // Fallback: use movement direction to determine sprite row (for multi-row sheets)
            const direction = SpriteUtils.angleToDirection(movement.facingAngle);
            row = direction;
            
            // If moving, use frame based on time, otherwise use frame 0 (idle)
            const isMoving = movement.velocityX !== 0 || movement.velocityY !== 0;
            if (isMoving) {
                // Simple walk animation based on time
                const walkSpeed = 0.2; // seconds per frame
                col = Math.floor((performance.now() / 1000) / walkSpeed) % 4;
            } else {
                col = 0; // Idle frame
            }
        }
        
        // Clamp row and column to valid ranges
        if (spriteSheet) {
            row = Math.max(0, Math.min(row, spriteSheet.rows - 1));
            col = Math.max(0, Math.min(col, spriteSheet.cols - 1));
        }

        // Get frame coordinates from sprite sheet
        const frameCoords = SpriteUtils.getFrameCoords(spriteSheet, row, col);
        
        if (!frameCoords) {
            console.warn('No frame coordinates found for sprite sheet');
            return;
        }

        // Verify frame coordinates are valid
        if (frameCoords.sourceWidth <= 0 || frameCoords.sourceHeight <= 0) {
            console.warn('Invalid frame dimensions:', frameCoords);
            return;
        }
        
        // Debug: Log frame extraction info (first frame only, once)
        if (entity.id === 'player' && col === 0 && row === 0 && !this._debugLogged) {
            this._debugLogged = true;
            console.log('=== Sprite Frame Extraction Debug ===');
            console.log('Entity:', entity.id);
            console.log('Row:', row, 'Col:', col);
            console.log('Sprite Sheet:', {
                frameWidth: spriteSheet.frameWidth,
                frameHeight: spriteSheet.frameHeight,
                cols: spriteSheet.cols,
                rows: spriteSheet.rows,
                imageWidth: spriteSheet.image.width,
                imageHeight: spriteSheet.image.height
            });
            console.log('Frame Coords:', frameCoords);
            console.log('Expected: Single frame extracted from sprite sheet');
            console.log('=====================================');
        }

        // Calculate screen position with offset
        const drawX = screenX + sprite.offsetX * camera.zoom;
        const drawY = screenY + sprite.offsetY * camera.zoom;
        
        // Use frame dimensions for display size to maintain aspect ratio
        const frameAspectRatio = frameCoords.sourceWidth / frameCoords.sourceHeight;
        const baseSize = sprite.width * camera.zoom * sprite.scaleX;
        const drawWidth = baseSize;
        const drawHeight = baseSize / frameAspectRatio;

        // Apply transformations (try/finally ensures we always restore so transform never leaks to next frame)
        const combat = entity.getComponent(Combat);
        const renderable = entity.getComponent(Renderable);
        const appliedMeleeSpin = !!(renderable && renderable.type === 'player' && combat && combat.isAttacking && combat.currentAttackAnimationKey === 'meleeSpin');
        this.ctx.save();
        try {
            this.ctx.translate(drawX, drawY);
            if (appliedMeleeSpin) {
                const sweepProgress = PlayerCombatRenderer.getSweepProgress(combat);
                this.ctx.rotate(sweepProgress * Math.PI * 2);
            }
            this.ctx.scale(sprite.scaleX * (sprite.flipX ? -1 : 1), sprite.scaleY);
            this.ctx.rotate(sprite.rotation);

            // Draw sprite frame with pixel-perfect rendering
            const oldImageSmoothing = this.ctx.imageSmoothingEnabled;
            this.ctx.imageSmoothingEnabled = false;
            if (spriteSheet.cols > 1 && frameCoords.sourceWidth >= spriteSheet.image.width) {
                console.error('Frame width matches entire image width! This will draw the whole sprite sheet.', {
                    sourceWidth: frameCoords.sourceWidth,
                    sourceHeight: frameCoords.sourceHeight,
                    imageWidth: spriteSheet.image.width,
                    imageHeight: spriteSheet.image.height,
                    frameWidth: spriteSheet.frameWidth,
                    frameHeight: spriteSheet.frameHeight,
                    row, col
                });
                return;
            }
            const sx = Math.floor(frameCoords.sourceX);
            const sy = Math.floor(frameCoords.sourceY);
            const sWidth = Math.floor(frameCoords.sourceWidth);
            const sHeight = Math.floor(frameCoords.sourceHeight);
            this.ctx.drawImage(
                spriteSheet.image,
                sx, sy, sWidth, sHeight,
                -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
            );
            this.ctx.imageSmoothingEnabled = oldImageSmoothing;
            if (sprite.tint) {
                this.ctx.globalCompositeOperation = 'multiply';
                this.ctx.fillStyle = sprite.tint;
                this.ctx.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
                this.ctx.globalCompositeOperation = 'source-over';
            }
        } finally {
            this.ctx.restore();
        }

        // Draw additional effects (shadows, health bars, etc.)
        this.renderEntityEffects(entity, camera, screenX, screenY);
    }

    // Render additional effects for entities (shadows, health bars, etc.)
    renderEntityEffects(entity, camera, screenX, screenY) {
        const transform = entity.getComponent(Transform);
        const health = entity.getComponent(Health);
        const combat = entity.getComponent(Combat);
        const movement = entity.getComponent(Movement);
        const renderable = entity.getComponent(Renderable);

        // Draw shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(
            screenX,
            screenY + (transform.height / 2 + 5) * camera.zoom,
            (transform.width / 2) * camera.zoom,
            (transform.height / 4) * camera.zoom,
            0, 0, Math.PI * 2
        );
        this.ctx.fill();

        // Draw health bar if health is not full (and for player, always show bar area for stun below)
        const isPlayer = renderable && renderable.type === 'player';
        const barWidth = isPlayer ? 40 * camera.zoom : 30 * camera.zoom;
        const barHeight = isPlayer ? 5 * camera.zoom : 4 * camera.zoom;
        const barX = screenX - barWidth / 2;
        const barY = screenY - (transform.height + (isPlayer ? 10 : 8)) * camera.zoom;

        if (health && health.percent < 1) {
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(barX, barY, barWidth, barHeight);

            const healthPercent = health.percent;
            this.ctx.fillStyle = healthPercent > 0.5 ? '#44ff44' :
                                healthPercent > 0.25 ? '#ffff44' : '#ff4444';
            this.ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 1 / camera.zoom;
            this.ctx.strokeRect(barX, barY, barWidth, barHeight);
        }

        // Under health: stamina bar for player, stun bar for enemies
        const statusEffects = entity.getComponent(StatusEffects);
        const stamina = entity.getComponent(Stamina);
        if (isPlayer && stamina) {
            const gap = 2 * camera.zoom;
            const underBarHeight = 4 * camera.zoom;
            const underBarY = barY + barHeight + gap;
            this.ctx.fillStyle = '#0f1520';
            this.ctx.fillRect(barX, underBarY, barWidth, underBarHeight);
            this.ctx.strokeStyle = '#2a3548';
            this.ctx.lineWidth = 1 / camera.zoom;
            this.ctx.strokeRect(barX, underBarY, barWidth, underBarHeight);
            this.ctx.fillStyle = '#2a5070';
            this.ctx.fillRect(barX, underBarY, barWidth * stamina.percent, underBarHeight);
        } else if (!isPlayer && statusEffects && statusEffects.stunMeterPercent > 0) {
            const gap = 2 * camera.zoom;
            const stunBarHeight = 3 * camera.zoom;
            const stunBarY = barY + barHeight + gap;
            this.ctx.fillStyle = '#222';
            this.ctx.fillRect(barX, stunBarY, barWidth, stunBarHeight);
            this.ctx.strokeStyle = '#444';
            this.ctx.lineWidth = 1 / camera.zoom;
            this.ctx.strokeRect(barX, stunBarY, barWidth, stunBarHeight);
            const stunPercent = statusEffects.stunMeterPercent;
            this.ctx.fillStyle = stunPercent >= 1 ? '#ff6600' : '#ffaa00';
            this.ctx.fillRect(barX, stunBarY, barWidth * stunPercent, stunBarHeight);
        }

        // Stun text indicator (STUNNED)
        if (statusEffects && statusEffects.isStunned) {
            const barOffset = (transform.height + 10) * camera.zoom;
            const stunY = screenY - barOffset - (health && health.percent < 1 ? 14 * camera.zoom : 8 * camera.zoom);
            this.ctx.save();
            this.ctx.font = `bold ${Math.max(10, 12 * camera.zoom)}px sans-serif`;
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2 / camera.zoom;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.strokeText('STUNNED', screenX, stunY);
            this.ctx.fillText('STUNNED', screenX, stunY);
            this.ctx.restore();
        }

        // Player: attack arc, crossbow, sword, shield (only when character sprites are OFF — when ON, sprite art includes the weapon)
        if (renderable && renderable.type === 'player') {
            const useCharacterSprites = !this.settings || this.settings.useCharacterSprites !== false;
            const weapon = combat && combat.playerAttack ? combat.playerAttack.weapon : null;
            const isCrossbow = weapon && weapon.isRanged === true;
            if (!useCharacterSprites) {
                const isMeleeSpin = combat && combat.isAttacking && combat.currentAttackAnimationKey === 'meleeSpin';
                if (isMeleeSpin) {
                    this.ctx.save();
                    try {
                        this.ctx.translate(screenX, screenY);
                        this.ctx.rotate(PlayerCombatRenderer.getSweepProgress(combat) * Math.PI * 2);
                        this.ctx.translate(-screenX, -screenY);
                        if (combat && combat.isAttacking && movement) {
                            PlayerCombatRenderer.drawAttackArc(this.ctx, screenX, screenY, combat, movement, camera, { comboColors: false });
                        }
                        if (isCrossbow && combat && movement && transform) {
                            PlayerCombatRenderer.drawCrossbow(this.ctx, screenX, screenY, transform, movement, combat, camera);
                        } else if (combat && movement && transform) {
                            PlayerCombatRenderer.drawSword(this.ctx, screenX, screenY, transform, movement, combat, camera);
                            PlayerCombatRenderer.drawShield(this.ctx, screenX, screenY, transform, movement, combat, camera);
                        }
                    } finally {
                        this.ctx.restore();
                    }
                } else {
                    if (combat && combat.isAttacking && movement) {
                        PlayerCombatRenderer.drawAttackArc(this.ctx, screenX, screenY, combat, movement, camera, { comboColors: false });
                    }
                    if (isCrossbow && combat && movement && transform) {
                        PlayerCombatRenderer.drawCrossbow(this.ctx, screenX, screenY, transform, movement, combat, camera);
                    } else if (combat && movement && transform) {
                        PlayerCombatRenderer.drawSword(this.ctx, screenX, screenY, transform, movement, combat, camera);
                        PlayerCombatRenderer.drawShield(this.ctx, screenX, screenY, transform, movement, combat, camera);
                    }
                }
            }
            const crossbowConfig = GameConfig.player.crossbow;
            const reloadInProgress = entity.crossbowReloadInProgress === true;
            if (isCrossbow && crossbowConfig && transform) {
                const pBarWidth = 40 * camera.zoom;
                const pBarHeight = 5 * camera.zoom;
                const pBarX = screenX - pBarWidth / 2;
                const pBarY = screenY - (transform.height + 10) * camera.zoom;
                const gap = 3 * camera.zoom;
                let reloadBarY = pBarY + pBarHeight + gap;
                if (stamina)
                    reloadBarY += (4 * camera.zoom) + gap;
                const reloadBarHeight = 4 * camera.zoom;
                this.ctx.fillStyle = '#1a1208';
                this.ctx.fillRect(pBarX, reloadBarY, pBarWidth, reloadBarHeight);
                this.ctx.strokeStyle = '#3d2817';
                this.ctx.lineWidth = 1 / camera.zoom;
                this.ctx.strokeRect(pBarX, reloadBarY, pBarWidth, reloadBarHeight);
                const progress = Math.min(1, entity.crossbowReloadProgress ?? 1);
                const perfectStart = crossbowConfig.perfectWindowStart;
                const perfectEnd = crossbowConfig.perfectWindowEnd;
                this.ctx.fillStyle = 'rgba(180, 220, 100, 0.4)';
                this.ctx.fillRect(pBarX + pBarWidth * perfectStart, reloadBarY, pBarWidth * (perfectEnd - perfectStart), reloadBarHeight);
                this.ctx.strokeStyle = 'rgba(200, 255, 120, 0.6)';
                this.ctx.lineWidth = 1 / camera.zoom;
                this.ctx.strokeRect(pBarX + pBarWidth * perfectStart, reloadBarY, pBarWidth * (perfectEnd - perfectStart), reloadBarHeight);
                this.ctx.fillStyle = '#4a6040';
                this.ctx.fillRect(pBarX, reloadBarY, pBarWidth * progress, reloadBarHeight);
            }
            // Stun duration bar (sprite path): below stamina / reload when stunned
            if (statusEffects && statusEffects.isStunned) {
                const gap = 3 * camera.zoom;
                const pBarY = screenY - (transform.height + 10) * camera.zoom;
                const pBarHeight = 5 * camera.zoom;
                let stunDurBarY = pBarY + pBarHeight + gap;
                if (stamina) stunDurBarY += (4 * camera.zoom) + gap;
                if (isCrossbow && crossbowConfig) stunDurBarY += (4 * camera.zoom) + gap;
                const stunDurBarHeight = 3 * camera.zoom;
                const stunDurBarW = 40 * camera.zoom;
                const stunDurBarX = screenX - stunDurBarW / 2;
                this.ctx.fillStyle = '#2a1a0a';
                this.ctx.fillRect(stunDurBarX, stunDurBarY, stunDurBarW, stunDurBarHeight);
                this.ctx.strokeStyle = '#4a3020';
                this.ctx.lineWidth = 1 / camera.zoom;
                this.ctx.strokeRect(stunDurBarX, stunDurBarY, stunDurBarW, stunDurBarHeight);
                const stunRemain = statusEffects.stunDurationPercentRemaining;
                this.ctx.fillStyle = '#ffaa00';
                this.ctx.fillRect(stunDurBarX, stunDurBarY, stunDurBarW * stunRemain, stunDurBarHeight);
            }
            // Charge attack meter (sprite path + sanctuary): vertical bar on left of player when holding attack
            const inputSystem = this.systems ? this.systems.get('input') : null;
            if (inputSystem && inputSystem.isCharging && transform) {
                const chargeDuration = inputSystem.getChargeDuration();
                const chargedAttackConfig = GameConfig.player.chargedAttack;
                const maxChargeTime = chargedAttackConfig.maxChargeTime;
                const minChargeTime = chargedAttackConfig.minChargeTime;
                if (chargeDuration >= minChargeTime) {
                    const chargeProgress = Math.min(1.0, (chargeDuration - minChargeTime) / (maxChargeTime - minChargeTime));
                    const meterWidth = 6 * camera.zoom;
                    const meterHeight = 40 * camera.zoom;
                    const meterX = screenX - (transform.width / 2 + 15) * camera.zoom;
                    const meterY = screenY - meterHeight / 2;
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    this.ctx.fillRect(meterX - 1, meterY - 1, meterWidth + 2, meterHeight + 2);
                    this.ctx.strokeStyle = '#ffffff';
                    this.ctx.lineWidth = 1 / camera.zoom;
                    this.ctx.strokeRect(meterX, meterY, meterWidth, meterHeight);
                    const fillHeight = meterHeight * chargeProgress;
                    const fillY = meterY + meterHeight - fillHeight;
                    const gradient = this.ctx.createLinearGradient(meterX, meterY + meterHeight, meterX, meterY);
                    gradient.addColorStop(0, '#ffff00');
                    gradient.addColorStop(0.5, '#ff8800');
                    gradient.addColorStop(1, '#ff0000');
                    this.ctx.fillStyle = gradient;
                    this.ctx.fillRect(meterX, fillY, meterWidth, fillHeight);
                }
            }
        }
    }

    renderPlayer(entity, camera, screenX, screenY) {
        const transform = entity.getComponent(Transform);
        const movement = entity.getComponent(Movement);
        const combat = entity.getComponent(Combat);
        const health = entity.getComponent(Health);
        const renderable = entity.getComponent(Renderable);
        const inputSystem = this.systems ? this.systems.get('input') : null;

        // Draw path if following one
        if (movement && movement.path.length > 0) {
            this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
            this.ctx.lineWidth = 2 / camera.zoom;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, screenY);
            
            for (let i = movement.pathIndex; i < movement.path.length; i++) {
                const waypoint = movement.path[i];
                const wpScreenX = camera.toScreenX(waypoint.x);
                const wpScreenY = camera.toScreenY(waypoint.y);
                this.ctx.lineTo(wpScreenX, wpScreenY);
            }
            this.ctx.stroke();
        }

        const isMeleeSpin = combat && combat.isAttacking && combat.currentAttackAnimationKey === 'meleeSpin';
        if (isMeleeSpin) {
            this.ctx.save();
            try {
                this.ctx.translate(screenX, screenY);
                this.ctx.rotate(PlayerCombatRenderer.getSweepProgress(combat) * Math.PI * 2);
                this.ctx.translate(-screenX, -screenY);
        if (combat && combat.isAttacking) {
            PlayerCombatRenderer.drawAttackArc(this.ctx, screenX, screenY, combat, movement, camera, { comboColors: true });
        }

        // Draw shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        this.ctx.beginPath();
        this.ctx.ellipse(
            screenX,
            screenY + (transform.height / 2 + 6) * camera.zoom,
            (transform.width * 0.65) * camera.zoom,
            (transform.height / 3.5) * camera.zoom,
            0, 0, Math.PI * 2
        );
        this.ctx.fill();

        const isDodging = movement && movement.isDodging;
        const w = transform.width * camera.zoom;
        const h = transform.height * camera.zoom;

        if (isDodging) this.ctx.globalAlpha = 0.6;

        const lw = Math.max(1, 2 / camera.zoom);
        this.ctx.lineWidth = lw;
        const steel = isDodging ? '#707080' : (combat && combat.isAttacking ? '#9a8b8b' : '#8b8b9a');
        const steelDark = '#5a5a68';
        const steelDarker = '#4a4a58';

        // Top-down knight's helmet (rotates with facing direction); pauldrons drawn first so helmet sits on top
        const facingAngle = movement ? movement.facingAngle : 0;
        this.ctx.save();
        this.ctx.translate(screenX, screenY);
        this.ctx.rotate(facingAngle);

        const helmetRx = w * 0.42;
        const helmetRy = w * 0.38;

        // Pauldrons first (under the helmet in perspective – only the rims peek out from under the dome)
        const paulOffsetY = helmetRy * 0.72;  // partly under helmet so dome covers inner portion
        const paulRx = w * 0.22;
        const paulRy = w * 0.28;
        this.ctx.fillStyle = steel;
        this.ctx.strokeStyle = steelDarker;
        this.ctx.lineWidth = lw;
        this.ctx.beginPath();
        this.ctx.ellipse(0, paulOffsetY, paulRx, paulRy, 0, 0, Math.PI * 2);
        this.ctx.ellipse(0, -paulOffsetY, paulRx, paulRy, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Helmet dome on top (covers inner part of pauldrons so they read as underneath)
        this.ctx.fillStyle = isDodging ? '#505060' : steelDark;
        this.ctx.strokeStyle = steelDarker;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, helmetRx, helmetRy, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Visor slit (dark line at "front" of helmet – positive X in local space)
        const slitY = 0;
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.lineWidth = Math.max(1.5, lw * 1.2);
        this.ctx.beginPath();
        this.ctx.moveTo(helmetRx * 0.35, slitY);
        this.ctx.lineTo(helmetRx * 0.95, slitY);
        this.ctx.stroke();

        // Slight highlight along top ridge (center line front-to-back)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        this.ctx.lineWidth = lw * 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(-helmetRx * 0.5, 0);
        this.ctx.lineTo(helmetRx * 0.5, 0);
        this.ctx.stroke();

        this.ctx.restore();
        this.ctx.globalAlpha = 1.0;

        const weapon = combat && combat.playerAttack ? combat.playerAttack.weapon : null;
        const isCrossbow = weapon && weapon.isRanged === true;
        if (isCrossbow) {
            PlayerCombatRenderer.drawCrossbow(this.ctx, screenX, screenY, transform, movement, combat, camera);
        } else {
            PlayerCombatRenderer.drawSword(this.ctx, screenX, screenY, transform, movement, combat, camera);
            PlayerCombatRenderer.drawShield(this.ctx, screenX, screenY, transform, movement, combat, camera);
        }
            } finally {
                this.ctx.restore();
            }
        } else {
        if (combat && combat.isAttacking) {
            PlayerCombatRenderer.drawAttackArc(this.ctx, screenX, screenY, combat, movement, camera, { comboColors: true });
        }
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        this.ctx.beginPath();
        this.ctx.ellipse(screenX, screenY + (transform.height / 2 + 6) * camera.zoom, (transform.width * 0.65) * camera.zoom, (transform.height / 3.5) * camera.zoom, 0, 0, Math.PI * 2);
        this.ctx.fill();
        const isDodging = movement && movement.isDodging;
        const w = transform.width * camera.zoom;
        const h = transform.height * camera.zoom;
        if (isDodging) this.ctx.globalAlpha = 0.6;
        const lw = Math.max(1, 2 / camera.zoom);
        this.ctx.lineWidth = lw;
        const steel = isDodging ? '#707080' : (combat && combat.isAttacking ? '#9a8b8b' : '#8b8b9a');
        const steelDark = '#5a5a68';
        const steelDarker = '#4a4a58';
        const facingAngle = movement ? movement.facingAngle : 0;
        this.ctx.save();
        this.ctx.translate(screenX, screenY);
        this.ctx.rotate(facingAngle);
        const helmetRx = w * 0.42;
        const helmetRy = w * 0.38;
        const paulOffsetY = helmetRy * 0.72;
        const paulRx = w * 0.22;
        const paulRy = w * 0.28;
        this.ctx.fillStyle = steel;
        this.ctx.strokeStyle = steelDarker;
        this.ctx.lineWidth = lw;
        this.ctx.beginPath();
        this.ctx.ellipse(0, paulOffsetY, paulRx, paulRy, 0, 0, Math.PI * 2);
        this.ctx.ellipse(0, -paulOffsetY, paulRx, paulRy, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillStyle = isDodging ? '#505060' : steelDark;
        this.ctx.strokeStyle = steelDarker;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, helmetRx, helmetRy, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        this.ctx.lineWidth = Math.max(1.5, lw * 1.2);
        this.ctx.beginPath();
        this.ctx.moveTo(helmetRx * 0.35, 0);
        this.ctx.lineTo(helmetRx * 0.95, 0);
        this.ctx.stroke();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        this.ctx.lineWidth = lw * 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(-helmetRx * 0.5, 0);
        this.ctx.lineTo(helmetRx * 0.5, 0);
        this.ctx.stroke();
        this.ctx.restore();
        this.ctx.globalAlpha = 1.0;
        const weapon = combat && combat.playerAttack ? combat.playerAttack.weapon : null;
        const isCrossbow = weapon && weapon.isRanged === true;
        if (isCrossbow) {
            PlayerCombatRenderer.drawCrossbow(this.ctx, screenX, screenY, transform, movement, combat, camera);
        } else {
            PlayerCombatRenderer.drawSword(this.ctx, screenX, screenY, transform, movement, combat, camera);
            PlayerCombatRenderer.drawShield(this.ctx, screenX, screenY, transform, movement, combat, camera);
        }
        }

        // Draw health bar
        if (health) {
            const barWidth = 40 * camera.zoom;
            const barHeight = 5 * camera.zoom;
            const barX = screenX - barWidth / 2;
            const barY = screenY - (transform.height + 10) * camera.zoom;

            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(barX, barY, barWidth, barHeight);

            const healthPercent = health.percent;
            this.ctx.fillStyle = healthPercent > 0.5 ? '#44ff44' : 
                                healthPercent > 0.25 ? '#ffff44' : '#ff4444';
            this.ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 1 / camera.zoom;
            this.ctx.strokeRect(barX, barY, barWidth, barHeight);
            
            this.ctx.textAlign = 'left';

            let barsBottomY = barY + barHeight + (3 * camera.zoom);
            const stamina = entity.getComponent(Stamina);
            if (stamina) {
                const gap = 3 * camera.zoom;
                const staminaBarHeight = 4 * camera.zoom;
                const staminaBarY = barY + barHeight + gap;
                barsBottomY = staminaBarY + staminaBarHeight + gap;
                this.ctx.fillStyle = '#0f1520';
                this.ctx.fillRect(barX, staminaBarY, barWidth, staminaBarHeight);
                this.ctx.strokeStyle = '#2a3548';
                this.ctx.strokeRect(barX, staminaBarY, barWidth, staminaBarHeight);
                const staminaPercent = stamina.percent;
                this.ctx.fillStyle = '#2a5070';
                this.ctx.fillRect(barX, staminaBarY, barWidth * staminaPercent, staminaBarHeight);
            }

            // Crossbow reload bar: under health (and stamina bar) — always show when crossbow equipped
            const crossbowConfig = GameConfig.player.crossbow;
            if (isCrossbow && crossbowConfig) {
                const reloadBarHeight = 4 * camera.zoom;
                const reloadBarY = barsBottomY;
                const reloadBarX = barX;
                const reloadBarW = barWidth;

                this.ctx.fillStyle = '#1a1208';
                this.ctx.fillRect(reloadBarX, reloadBarY, reloadBarW, reloadBarHeight);
                this.ctx.strokeStyle = '#3d2817';
                this.ctx.lineWidth = 1 / camera.zoom;
                this.ctx.strokeRect(reloadBarX, reloadBarY, reloadBarW, reloadBarHeight);

                const progress = Math.min(1, entity.crossbowReloadProgress ?? 1);
                const perfectStart = crossbowConfig.perfectWindowStart;
                const perfectEnd = crossbowConfig.perfectWindowEnd;

                this.ctx.fillStyle = 'rgba(180, 220, 100, 0.4)';
                this.ctx.fillRect(
                    reloadBarX + reloadBarW * perfectStart,
                    reloadBarY,
                    reloadBarW * (perfectEnd - perfectStart),
                    reloadBarHeight
                );
                this.ctx.strokeStyle = 'rgba(200, 255, 120, 0.6)';
                this.ctx.lineWidth = 1 / camera.zoom;
                this.ctx.strokeRect(
                    reloadBarX + reloadBarW * perfectStart,
                    reloadBarY,
                    reloadBarW * (perfectEnd - perfectStart),
                    reloadBarHeight
                );

                this.ctx.fillStyle = '#4a6040';
                this.ctx.fillRect(reloadBarX, reloadBarY, reloadBarW * progress, reloadBarHeight);
                barsBottomY = reloadBarY + reloadBarHeight;
            }

            // Stun duration bar: appears below other bars while player is stunned (drains as time left)
            const statusEffects = entity.getComponent(StatusEffects);
            if (statusEffects && statusEffects.isStunned) {
                const gap = 3 * camera.zoom;
                const stunDurBarHeight = 3 * camera.zoom;
                const stunDurBarY = barsBottomY + gap;
                const stunDurBarW = barWidth;
                this.ctx.fillStyle = '#2a1a0a';
                this.ctx.fillRect(barX, stunDurBarY, stunDurBarW, stunDurBarHeight);
                this.ctx.strokeStyle = '#4a3020';
                this.ctx.lineWidth = 1 / camera.zoom;
                this.ctx.strokeRect(barX, stunDurBarY, stunDurBarW, stunDurBarHeight);
                const stunRemain = statusEffects.stunDurationPercentRemaining;
                this.ctx.fillStyle = '#ffaa00';
                this.ctx.fillRect(barX, stunDurBarY, stunDurBarW * stunRemain, stunDurBarHeight);
            }
        }
        
        // Render charge meter if charging (vertical bar on left side of player)
        // Only show after minimum charge time (0.5 seconds)
        if (inputSystem && inputSystem.isCharging) {
            const chargeDuration = inputSystem.getChargeDuration();
            const chargedAttackConfig = GameConfig.player.chargedAttack;
            const maxChargeTime = chargedAttackConfig.maxChargeTime;
            const minChargeTime = chargedAttackConfig.minChargeTime;
            
            // Only display meter after minimum charge time
            if (chargeDuration < minChargeTime) {
                return;
            }
            
            // Calculate charge progress (0.0 to 1.0)
            const chargeProgress = Math.min(1.0, (chargeDuration - minChargeTime) / (maxChargeTime - minChargeTime));
            
            // Position meter on left side of player (vertical)
            const meterWidth = 6 * camera.zoom;
            const meterHeight = 40 * camera.zoom;
            const meterX = screenX - (transform.width / 2 + 15) * camera.zoom;
            const meterY = screenY - meterHeight / 2;
            
            // Draw meter background
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            this.ctx.fillRect(meterX - 1, meterY - 1, meterWidth + 2, meterHeight + 2);
            
            // Draw meter border
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1 / camera.zoom;
            this.ctx.strokeRect(meterX, meterY, meterWidth, meterHeight);
            
            // Draw charge fill (from bottom to top)
            const fillHeight = meterHeight * chargeProgress;
            const fillY = meterY + meterHeight - fillHeight;
            
            // Gradient from yellow (bottom) to orange to red (top)
            const gradient = this.ctx.createLinearGradient(meterX, meterY + meterHeight, meterX, meterY);
            gradient.addColorStop(0, '#ffff00'); // Yellow (bottom)
            gradient.addColorStop(0.5, '#ff8800'); // Orange
            gradient.addColorStop(1, '#ff0000'); // Red (top)
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(meterX, fillY, meterWidth, fillHeight);
        }
    }

    renderEnemy(entity, camera, screenX, screenY) {
        const transform = entity.getComponent(Transform);
        const movement = entity.getComponent(Movement);
        const combat = entity.getComponent(Combat);
        const health = entity.getComponent(Health);
        const renderable = entity.getComponent(Renderable);
        const ai = entity.getComponent(AI);

        // Draw pillar-of-flame telegraph (circle at player position while demon is casting)
        if (ai && ai.isCastingPillar) {
            const player = this.systems && this.systems.get('entities') ? this.systems.get('entities').get('player') : null;
            const playerTransform = player ? player.getComponent(Transform) : null;
            if (playerTransform) {
                const pillarConfig = GameConfig.enemy.types.greaterDemon && GameConfig.enemy.types.greaterDemon.pillarFlame;
                const radius = (pillarConfig && pillarConfig.radius ? pillarConfig.radius : 45) * camera.zoom;
                const telegraphX = camera.toScreenX(playerTransform.x);
                const telegraphY = camera.toScreenY(playerTransform.y);
                const progress = pillarConfig && pillarConfig.castDelay ? 1 - (ai.pillarCastTimer / pillarConfig.castDelay) : 0;
                this.ctx.strokeStyle = 'rgba(255, 120, 40, 0.6)';
                this.ctx.lineWidth = 2 / camera.zoom;
                this.ctx.setLineDash([4 / camera.zoom, 4 / camera.zoom]);
                this.ctx.beginPath();
                this.ctx.arc(telegraphX, telegraphY, radius, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
                this.ctx.fillStyle = 'rgba(200, 80, 30, 0.15)';
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(telegraphX, telegraphY, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
                this.ctx.lineTo(telegraphX, telegraphY);
                this.ctx.closePath();
                this.ctx.fillStyle = 'rgba(255, 100, 40, 0.25)';
                this.ctx.fill();
            }
        }

        // Draw demon claw cone (arc in front of demon) – infernal iron
        if (combat && combat.demonAttack && combat.isAttacking) {
            const range = (combat.attackRange || 70) * camera.zoom;
            const arc = combat.attackArc != null ? combat.attackArc : Utils.degToRad(100);
            const facingAngle = movement ? movement.facingAngle : 0;
            const halfArc = arc / 2;
            const startAngle = facingAngle - halfArc;
            const endAngle = facingAngle + halfArc;
            this.ctx.fillStyle = 'rgba(60, 20, 20, 0.28)';
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, range, startAngle, endAngle);
            this.ctx.lineTo(screenX, screenY);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.strokeStyle = '#4a2020';
            this.ctx.lineWidth = 3 / camera.zoom;
            this.ctx.stroke();
            this.ctx.strokeStyle = 'rgba(140, 50, 50, 0.7)';
            this.ctx.lineWidth = Math.max(1, 1.5 / camera.zoom);
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, range - 3 / camera.zoom, startAngle, endAngle);
            this.ctx.stroke();
        }

        // Draw lunge charge indicator
        if (ai && ai.isChargingLunge) {
            // Get lunge config to calculate progress
            const enemyConfig = ai.enemyType ? GameConfig.enemy.types[ai.enemyType] : null;
            const lungeConfig = enemyConfig && enemyConfig.lunge ? enemyConfig.lunge : null;
            if (lungeConfig) {
                const maxChargeTime = lungeConfig.chargeTime;
                const remainingTime = Math.max(0, ai.lungeChargeTimer);
                const chargeProgress = 1 - (remainingTime / maxChargeTime);
                const pulseSize = (transform.width / 2 + 10) * camera.zoom * (1 + chargeProgress * 0.5);
                const alpha = 0.8 - chargeProgress * 0.4;
                // Medieval menace: deep crimson / iron
                this.ctx.strokeStyle = `rgba(120, 40, 35, ${alpha})`;
                this.ctx.lineWidth = 4 / camera.zoom;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, pulseSize, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.strokeStyle = `rgba(160, 80, 40, ${0.5 + chargeProgress * 0.4})`;
                this.ctx.lineWidth = 3 / camera.zoom;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, (transform.width / 2 + 5) * camera.zoom, 0, Math.PI * 2 * chargeProgress);
                this.ctx.stroke();
            }
        }

        // Draw wind-up indicator (goblin etc. – arc in front)
        if (combat && combat.isWindingUp) {
            const windUpProgress = combat.windUpProgress;
            const pulseSize = (transform.width / 2 + 5) * camera.zoom * (1 + windUpProgress * 0.3);
            const alpha = 0.6 - windUpProgress * 0.4;
            const facingAngle = movement ? movement.facingAngle : 0;
            const arc = combat.attackArc != null ? combat.attackArc : Utils.degToRad(90);
            const halfArc = arc / 2;

            // Pulsing circle during wind-up – amber/bronze
            this.ctx.strokeStyle = `rgba(140, 100, 50, ${alpha})`;
            this.ctx.lineWidth = 3 / camera.zoom;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, pulseSize, 0, Math.PI * 2);
            this.ctx.stroke();

            // Attack range indicator – cone in front (fades in during wind-up), wrought-iron look
            const range = combat.attackRange * camera.zoom;
            const startAngle = facingAngle - halfArc;
            const endAngle = facingAngle + halfArc;
            this.ctx.fillStyle = `rgba(35, 30, 28, ${windUpProgress * 0.2})`;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, range, startAngle, endAngle);
            this.ctx.lineTo(screenX, screenY);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.strokeStyle = `rgba(80, 70, 60, ${windUpProgress * 0.7})`;
            this.ctx.lineWidth = 2 / camera.zoom;
            this.ctx.stroke();
        }

        // Draw attack indicator (when attack actually happens) – arc in front; skip demon (drawn above); medieval steel
        if (combat && combat.isAttacking && !combat.isWindingUp && !combat.demonAttack) {
            const facingAngle = movement ? movement.facingAngle : 0;
            const arc = combat.attackArc != null ? combat.attackArc : Utils.degToRad(90);
            const halfArc = arc / 2;
            const range = combat.attackRange * camera.zoom;
            const startAngle = facingAngle - halfArc;
            const endAngle = facingAngle + halfArc;
            this.ctx.fillStyle = 'rgba(40, 35, 30, 0.24)';
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, range, startAngle, endAngle);
            this.ctx.lineTo(screenX, screenY);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.strokeStyle = '#4a4a52';
            this.ctx.lineWidth = 3 / camera.zoom;
            this.ctx.stroke();
            this.ctx.strokeStyle = 'rgba(140, 130, 120, 0.65)';
            this.ctx.lineWidth = Math.max(1, 1.5 / camera.zoom);
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, range - 3 / camera.zoom, startAngle, endAngle);
            this.ctx.stroke();
        }

        // Draw shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(
            screenX,
            screenY + (transform.height / 2 + 5) * camera.zoom,
            (transform.width / 2) * camera.zoom,
            (transform.height / 4) * camera.zoom,
            0, 0, Math.PI * 2
        );
        this.ctx.fill();

        // Body color – tint during wind-up or lunge
        let bodyColor = renderable.color;
        if (ai && ai.isChargingLunge) {
            const enemyConfig = ai.enemyType ? GameConfig.enemy.types[ai.enemyType] : null;
            const lungeConfig = enemyConfig && enemyConfig.lunge ? enemyConfig.lunge : null;
            if (lungeConfig) {
                const maxChargeTime = lungeConfig.chargeTime;
                const remainingTime = Math.max(0, ai.lungeChargeTimer);
                const chargeProgress = 1 - (remainingTime / maxChargeTime);
                bodyColor = `rgba(255, ${Math.floor(100 + (1 - chargeProgress) * 100)}, ${Math.floor(50 + (1 - chargeProgress) * 50)}, 1)`;
            }
        } else if (combat && combat.isWindingUp) {
            const intensity = combat.windUpProgress;
            bodyColor = `rgba(255, ${Math.floor(100 + (1 - intensity) * 100)}, ${Math.floor(50 + (1 - intensity) * 50)}, 1)`;
        } else if (combat && combat.isLunging) {
            bodyColor = '#ff0000';
        }

        const sizeMultiplier = combat && combat.isWindingUp ? (1 + combat.windUpProgress * 0.1) : 1;
        const r = (transform.width / 2) * camera.zoom * sizeMultiplier;
        const h = (transform.height / 2) * camera.zoom * sizeMultiplier;
        const enemyType = ai && ai.enemyType ? ai.enemyType : 'goblin';
        const strokeColor = (combat && (combat.isWindingUp || combat.isAttacking)) ? '#ff0000' : (ai && ai.state === 'attack') ? '#ff0000' : '#000000';
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = 2 / camera.zoom;

        if (enemyType === 'goblin') {
            // Goblin: hunched oval body, pointy ears, small eyes
            this.ctx.fillStyle = bodyColor;
            this.ctx.beginPath();
            this.ctx.ellipse(screenX, screenY + h * 0.15, r * 0.95, h * 1.0, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.fillStyle = bodyColor;
            this.ctx.strokeStyle = strokeColor;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX - r * 0.6, screenY - h * 0.6);
            this.ctx.lineTo(screenX - r * 0.95, screenY - h * 1.15);
            this.ctx.lineTo(screenX - r * 0.35, screenY - h * 0.5);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(screenX + r * 0.6, screenY - h * 0.6);
            this.ctx.lineTo(screenX + r * 0.95, screenY - h * 1.15);
            this.ctx.lineTo(screenX + r * 0.35, screenY - h * 0.5);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            const eyeSize = 2.5 / camera.zoom;
            this.ctx.fillStyle = ai && ai.state === 'chase' ? '#ff3300' : '#1a1a0a';
            this.ctx.beginPath();
            this.ctx.arc(screenX - r * 0.35, screenY - h * 0.2, eyeSize, 0, Math.PI * 2);
            this.ctx.arc(screenX + r * 0.35, screenY - h * 0.2, eyeSize, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (enemyType === 'lesserDemon') {
            // Lesser demon: similar to goblin but darker/more demonic
            this.ctx.fillStyle = bodyColor;
            this.ctx.beginPath();
            this.ctx.ellipse(screenX, screenY, r * 0.85, h * 0.9, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.fillStyle = '#3a1a1a';
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = 2 / camera.zoom;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX - r * 0.6, screenY - h * 0.6);
            this.ctx.lineTo(screenX - r * 0.95, screenY - h * 1.15);
            this.ctx.lineTo(screenX - r * 0.35, screenY - h * 0.5);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(screenX + r * 0.6, screenY - h * 0.6);
            this.ctx.lineTo(screenX + r * 0.95, screenY - h * 1.15);
            this.ctx.lineTo(screenX + r * 0.35, screenY - h * 0.5);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            const eyeSize = 2.5 / camera.zoom;
            this.ctx.fillStyle = ai && ai.state === 'chase' ? '#ff4400' : '#2a0a0a';
            this.ctx.beginPath();
            this.ctx.arc(screenX - r * 0.35, screenY - h * 0.2, eyeSize, 0, Math.PI * 2);
            this.ctx.arc(screenX + r * 0.35, screenY - h * 0.2, eyeSize, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (enemyType === 'skeleton') {
            // Skeleton: skull shape, dark sockets, bony
            this.ctx.fillStyle = bodyColor;
            this.ctx.beginPath();
            this.ctx.ellipse(screenX, screenY, r * 0.9, h * 0.95, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.fillStyle = '#2a2520';
            this.ctx.beginPath();
            this.ctx.ellipse(screenX - r * 0.28, screenY - h * 0.15, r * 0.2, h * 0.25, 0, 0, Math.PI * 2);
            this.ctx.ellipse(screenX + r * 0.28, screenY - h * 0.15, r * 0.2, h * 0.25, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#1a1510';
            this.ctx.lineWidth = 1 / camera.zoom;
            this.ctx.stroke();
            this.ctx.lineWidth = 2 / camera.zoom;
            this.ctx.strokeStyle = strokeColor;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX - r * 0.25, screenY + h * 0.4);
            this.ctx.lineTo(screenX, screenY + h * 0.75);
            this.ctx.lineTo(screenX + r * 0.25, screenY + h * 0.4);
            this.ctx.stroke();
        } else if (enemyType === 'greaterDemon') {
            // Greater demon: broad muscular torso, swept horns, shoulder mass, glowing eyes, tail
            const dr = r * 1.0;
            const dh = h * 1.05;
            this.ctx.fillStyle = bodyColor;
            this.ctx.beginPath();
            this.ctx.ellipse(screenX, screenY, dr * 1.15, dh * 1.0, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.fillStyle = '#2a0a12';
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = 2 / camera.zoom;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX - dr * 0.4, screenY - dh * 0.5);
            this.ctx.quadraticCurveTo(screenX - dr * 0.9, screenY - dh * 1.2, screenX - dr * 0.55, screenY - dh * 0.35);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(screenX + dr * 0.4, screenY - dh * 0.5);
            this.ctx.quadraticCurveTo(screenX + dr * 0.9, screenY - dh * 1.2, screenX + dr * 0.55, screenY - dh * 0.35);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.fillStyle = '#1a0508';
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, screenY + dh * 0.6);
            this.ctx.lineTo(screenX + 4 / camera.zoom, screenY + dh * 1.15);
            this.ctx.lineTo(screenX - 4 / camera.zoom, screenY + dh * 1.15);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            const eyeSize = 4 / camera.zoom;
            this.ctx.fillStyle = ai && ai.state === 'chase' ? '#ff2222' : '#ff5533';
            this.ctx.shadowColor = ai && ai.state === 'chase' ? '#ff4444' : 'rgba(255, 80, 50, 0.8)';
            this.ctx.shadowBlur = 6 / camera.zoom;
            this.ctx.beginPath();
            this.ctx.arc(screenX - dr * 0.3, screenY - dh * 0.12, eyeSize, 0, Math.PI * 2);
            this.ctx.arc(screenX + dr * 0.3, screenY - dh * 0.12, eyeSize, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        } else {
            this.ctx.fillStyle = bodyColor;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            const eyeSize = 2 / camera.zoom;
            const eyeOffset = 5 * camera.zoom;
            this.ctx.fillStyle = ai && ai.state === 'chase' ? '#ff0000' : '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(screenX - eyeOffset, screenY - eyeOffset, eyeSize, 0, Math.PI * 2);
            this.ctx.arc(screenX + eyeOffset, screenY - eyeOffset, eyeSize, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw health bar
        const barWidth = 30 * camera.zoom;
        const barHeight = 4 * camera.zoom;
        const barX = screenX - barWidth / 2;
        const barY = screenY - (transform.height + 8) * camera.zoom;

        if (health && health.percent < 1) {
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(barX, barY, barWidth, barHeight);

            const healthPercent = health.percent;
            this.ctx.fillStyle = healthPercent > 0.5 ? '#44ff44' : 
                                healthPercent > 0.25 ? '#ffff44' : '#ff4444';
            this.ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 1 / camera.zoom;
            this.ctx.strokeRect(barX, barY, barWidth, barHeight);
        }

        // Stun bar under health bar
        const statusEffects = entity.getComponent(StatusEffects);
        if (statusEffects && statusEffects.stunMeterPercent > 0) {
            const gap = 2 * camera.zoom;
            const stunBarHeight = 3 * camera.zoom;
            const stunBarY = barY + barHeight + gap;
            this.ctx.fillStyle = '#222';
            this.ctx.fillRect(barX, stunBarY, barWidth, stunBarHeight);
            this.ctx.strokeStyle = '#444';
            this.ctx.lineWidth = 1 / camera.zoom;
            this.ctx.strokeRect(barX, stunBarY, barWidth, stunBarHeight);
            const stunPercent = statusEffects.stunMeterPercent;
            this.ctx.fillStyle = stunPercent >= 1 ? '#ff6600' : '#ffaa00';
            this.ctx.fillRect(barX, stunBarY, barWidth * stunPercent, stunBarHeight);
        }
    }

    renderMinimap(camera, entityManager, worldWidth, worldHeight, portal = null, currentLevel = 1) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e535072a-96e6-4390-b673-9e50f66af7db',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RenderSystem.js:renderMinimap',message:'renderMinimap entered',data:{worldWidth,worldHeight,currentLevel},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        const minimapSize = 220;
        const minimapPadding = 16;
        const minimapX = this.canvas.width - minimapSize - minimapPadding;
        const minimapY = minimapPadding;
        const panelPadding = 14;
        const labelHeight = 22;
        const innerSize = minimapSize - panelPadding * 2;
        const mapAreaHeight = innerSize - labelHeight;
        const innerX = minimapX + panelPadding;
        const innerY = minimapY + panelPadding;

        const scaleX = innerSize / worldWidth;
        const scaleY = mapAreaHeight / worldHeight;
        const scale = Math.min(scaleX, scaleY);
        const minimapWidth = worldWidth * scale;
        const minimapHeight = worldHeight * scale;

        // Panel: wooden frame, gold trim
        this.ctx.fillStyle = '#1a1008';
        this.ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
        this.ctx.fillStyle = '#2c1810';
        this.ctx.fillRect(minimapX + 2, minimapY + 2, minimapSize - 4, minimapSize - 4);
        this.ctx.strokeStyle = '#4a3020';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);
        this.ctx.strokeStyle = 'rgba(201, 162, 39, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(minimapX + 3, minimapY + 3, minimapSize - 6, minimapSize - 6);

        // Label: current level name (inside panel with clear gap from border)
        const isHub = currentLevel === 0;
        const levelConfigLabel = isHub ? GameConfig.hub : (GameConfig.levels && GameConfig.levels[currentLevel]);
        const mapLabel = (levelConfigLabel && levelConfigLabel.name) ? levelConfigLabel.name : 'Map';
        this.ctx.fillStyle = '#c9a227';
        this.ctx.font = '600 12px Cinzel, Georgia, serif';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(mapLabel, innerX + 2, innerY + labelHeight / 2);
        this.ctx.textBaseline = 'alphabetic';

        this.ctx.save();
        this.ctx.translate(
            innerX + (innerSize - minimapWidth) / 2,
            innerY + labelHeight + (mapAreaHeight - minimapHeight) / 2
        );
        this.ctx.scale(scale, scale);
        
        // Draw world background (level theme)
        const tileSize = isHub && GameConfig.hub.tileSize ? GameConfig.hub.tileSize : GameConfig.world.tileSize;
        const levelConfigMinimap = isHub ? GameConfig.hub : (GameConfig.levels && GameConfig.levels[currentLevel]);
        const theme = levelConfigMinimap && levelConfigMinimap.theme ? levelConfigMinimap.theme : null;
        const ground = theme && theme.ground ? theme.ground : { r: 30, g: 50, b: 30, variation: 18 };
        for (let x = 0; x < worldWidth; x += tileSize) {
            for (let y = 0; y < worldHeight; y += tileSize) {
                const v = Math.floor((x + y) % 3) * (ground.variation || 15);
                const r = Math.max(0, Math.min(255, ground.r + v));
                const gVal = Math.max(0, Math.min(255, ground.g + v));
                const b = Math.max(0, Math.min(255, ground.b + v));
                this.ctx.fillStyle = `rgb(${r}, ${gVal}, ${b})`;
                this.ctx.fillRect(x, y, tileSize, tileSize);
            }
        }
        
        // Draw obstacles (use obstacle color for level-themed obstacles)
        const obstacleManager = this.systems.get('obstacles');
        if (obstacleManager) {
            for (const obstacle of obstacleManager.obstacles) {
                this.ctx.fillStyle = obstacle.color || '#2d5016';
                this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            }
        }
        
        // Draw entities (enemies smaller on minimap)
        const entities = entityManager.getAll();
        for (const entity of entities) {
            if (!entity.active) continue;
            
            const transform = entity.getComponent(Transform);
            const renderable = entity.getComponent(Renderable);
            if (!transform || !renderable) continue;
            
            const isEnemy = renderable.type === 'enemy';
            const dotRadius = isEnemy ? 1.5 / scale : 3 / scale;
            this.ctx.fillStyle = renderable.color;
            this.ctx.beginPath();
            this.ctx.arc(transform.x, transform.y, dotRadius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw portal when spawned (centered on portal rect)
        if (portal && portal.spawned) {
            const px = portal.x + portal.width / 2;
            const py = portal.y + portal.height / 2;
            const r = Math.max(6 / scale, (portal.width + portal.height) / 4);
            this.ctx.fillStyle = 'rgba(120, 80, 255, 0.9)';
            this.ctx.beginPath();
            this.ctx.arc(px, py, r, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(180, 140, 255, 1)';
            this.ctx.lineWidth = 2 / scale;
            this.ctx.stroke();
        }
        
        // Camera viewport: gold tint
        const effectiveWidth = this.canvas.width / camera.zoom;
        const effectiveHeight = this.canvas.height / camera.zoom;
        this.ctx.strokeStyle = 'rgba(201, 162, 39, 0.4)';
        this.ctx.lineWidth = 2 / scale;
        this.ctx.strokeRect(camera.x, camera.y, effectiveWidth, effectiveHeight);

        this.ctx.restore();

        // Objective underneath minimap
        const objectiveText = isHub ? 'Approach the board and press E to select a level' : (() => {
            const enemyManager = this.systems ? this.systems.get('enemies') : null;
            const kills = enemyManager ? enemyManager.getEnemiesKilledThisLevel() : 0;
            const levelCfg = GameConfig.levels && GameConfig.levels[currentLevel];
            const required = (levelCfg && levelCfg.killsToUnlockPortal != null) ? levelCfg.killsToUnlockPortal : 0;
            const hasPortalGoal = required > 0 && (GameConfig.levels[currentLevel + 1]);
            return hasPortalGoal
                ? `Slay ${required} foes to open the portal (${kills}/${required})`
                : (required > 0 ? `Foes felled: ${kills}` : '');
        })();
        if (objectiveText) {
            this.ctx.fillStyle = '#c4a574';
            this.ctx.font = '600 13px Cinzel, Georgia, serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(objectiveText, minimapX + panelPadding, minimapY + minimapSize + 14);
        }
    }
}

