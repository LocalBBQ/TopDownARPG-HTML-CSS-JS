// Entity layer: entities (sprites, player, enemies, effects). Uses context only.
class EntityLayerRenderer {
    render(context, data) {
        const { entities } = data;
        if (!entities) return;

        const { ctx, canvas, camera, systems, settings } = context;
        const spriteManager = systems ? systems.get('sprites') : null;
        const useCharacterSprites = !settings || settings.useCharacterSprites !== false;
        let playerDraw = null; // { entity, screenX, screenY } — draw player last so they're always on top (avoids blink when dash puts them under an enemy)
        for (const entity of entities) {
            if (!entity.active) continue;
            const transform = entity.getComponent(Transform);
            const renderable = entity.getComponent(Renderable);
            if (!transform || !renderable) continue;
            const screenX = camera.toScreenX(transform.x);
            const screenY = camera.toScreenY(transform.y);
            if (screenX < -50 || screenX > canvas.width + 50 ||
                screenY < -50 || screenY > canvas.height + 50) {
                continue;
            }
            const isPlayer = renderable.type === 'player';
            if (isPlayer) {
                playerDraw = { entity, screenX, screenY };
                continue;
            }
            const sprite = entity.getComponent(Sprite);
            const isCharacter = renderable.type === 'enemy';
            try {
                if (sprite && spriteManager && (useCharacterSprites || !isCharacter)) {
                    this._renderSprite(context, entity, screenX, screenY);
                } else {
                    if (renderable.type === 'enemy') {
                        this._renderEnemy(context, entity, screenX, screenY);
                    }
                }
            } catch (err) {
                console.warn('Render entity failed (skipping):', entity.id || renderable.type, err);
            }
        }
        // Player always uses procedural rendering so idle/melee/spin never switch methods (avoids blink on animation transition)
        if (playerDraw) {
            const { entity, screenX, screenY } = playerDraw;
            const renderable = entity.getComponent(Renderable);
            try {
                this._renderPlayer(context, entity, screenX, screenY);
            } catch (err) {
                console.warn('Render entity failed (skipping):', entity.id || renderable.type, err);
            }
        }
    }

    _renderSprite(context, entity, screenX, screenY) {
        const { ctx, canvas, camera, systems, settings } = context;
        const spriteManager = systems ? systems.get('sprites') : null;
        
        const transform = entity.getComponent(Transform);
        const sprite = entity.getComponent(Sprite);
        const animation = entity.getComponent(Animation);
        const movement = entity.getComponent(Movement);
        
        if (!sprite || !transform) return;

        const combat = entity.getComponent(Combat);
        const renderable = entity.getComponent(Renderable);
        let spriteSheet = sprite.getSpriteSheet(spriteManager, animation);
        // Use spin sprite sheet from frame 0 when combat starts a spin (avoids blink: idle sprite → spin sprite)
        const useSpinSheetForPlayer = !!(renderable && renderable.type === 'player' && combat && combat.isAttacking && combat.currentAttackAnimationKey === 'meleeSpin' && animation && animation.animations && animation.animations.meleeSpin);
        if (useSpinSheetForPlayer && spriteManager) {
            const spinSheet = spriteManager.getSpriteSheet(animation.animations.meleeSpin.spriteSheetKey);
            if (spinSheet && spinSheet.image) spriteSheet = spinSheet;
        }
        const animSpriteSheetKey = animation ? animation.getCurrentSpriteSheetKey() : null;
        
        if (!spriteSheet || !spriteSheet.image) {
            // Fallback to renderable if sprite not loaded
            const renderable = entity.getComponent(Renderable);
            if (renderable) {
                if (renderable.type === 'player') {
                    this._renderPlayer(context, entity, screenX, screenY);
                } else if (renderable.type === 'enemy') {
                    this._renderEnemy(context, entity, screenX, screenY);
                }
            }
            return;
        }

        // Determine which frame to render
        let row = 0;
        let col = 0;

        let frameBranch = 'none';
        if (useSpinSheetForPlayer && combat && combat.playerAttack && combat.attackDuration > 0) {
            frameBranch = 'spin';
            const progress = Math.min(1, combat.playerAttack.attackTimer / combat.attackDuration);
            const spinFrames = animation.animations.meleeSpin.frames;
            const numFrames = spinFrames ? spinFrames.length : 1;
            const frameIndex = Math.min(Math.floor(progress * numFrames), numFrames - 1);
            if (spriteSheet.rows > 1) {
                row = Math.floor(frameIndex / spriteSheet.cols);
                col = frameIndex % spriteSheet.cols;
            } else {
                row = 0;
                col = frameIndex;
            }
        } else if (animation && animation.currentAnimation) {
            frameBranch = 'currentAnim';
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
            frameBranch = 'movement';
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
        // Spin: use same rotation formula as procedural _renderPlayer (no Math.PI+pullBack) so both paths match and no blink
        const appliedMeleeSpin = !!(renderable && renderable.type === 'player' && combat && combat.isAttacking && combat.currentAttackAnimationKey === 'meleeSpin');
        ctx.save();
        try {
            ctx.translate(drawX, drawY);
            if (appliedMeleeSpin) {
                const sweepProgress = PlayerCombatRenderer.getSweepProgress(combat);
                const raw = combat.attackDuration > 0 ? Math.min(1, (combat.attackTimer || 0) / combat.attackDuration) : 0;
                const rotationBlend = raw < 0.08 ? Utils.easeInQuad(raw / 0.08) : 1;
                const outerRotation = sweepProgress * rotationBlend * Math.PI * 2;
                ctx.rotate(outerRotation);
            }
            ctx.scale(sprite.scaleX * (sprite.flipX ? -1 : 1), sprite.scaleY);
            ctx.rotate(sprite.rotation);

            // Draw sprite frame with pixel-perfect rendering
            const oldImageSmoothing = ctx.imageSmoothingEnabled;
            ctx.imageSmoothingEnabled = false;
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
            ctx.drawImage(
                spriteSheet.image,
                sx, sy, sWidth, sHeight,
                -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
            );
            ctx.imageSmoothingEnabled = oldImageSmoothing;
            if (sprite.tint) {
                ctx.globalCompositeOperation = 'multiply';
                ctx.fillStyle = sprite.tint;
                ctx.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
                ctx.globalCompositeOperation = 'source-over';
            }
        } finally {
            ctx.restore();
        }

        // Draw additional effects (shadows, health bars, etc.)
        this._drawHealingVialIfActive(context, entity, screenX, screenY, transform);
        this._renderEntityEffects(context, entity, screenX, screenY);
    }

    _drawHealingVialIfActive(context, entity, screenX, screenY, transform) {
        const { ctx, camera } = context;
        
        const renderable = entity.getComponent(Renderable);
        const healing = entity.getComponent(PlayerHealing);
        const movement = entity.getComponent(Movement);
        if (!transform || !(entity.id === 'player' || (renderable && renderable.type === 'player')) || !healing || !healing.isHealing) return;
        const z = camera.zoom;
        const vialW = 8 * z;
        const vialH = 14 * z;
        const facingAngle = movement ? movement.facingAngle : 0;
        const offsetDist = (transform.height / 2 + 12) * z;
        const vialCenterX = screenX + Math.cos(facingAngle) * offsetDist;
        const vialCenterY = screenY + Math.sin(facingAngle) * offsetDist;
        ctx.save();
        ctx.translate(vialCenterX, vialCenterY);
        ctx.rotate(facingAngle);
        const left = -vialW / 2;
        const top = -vialH / 2;
        ctx.strokeStyle = '#3d1a1a';
        ctx.lineWidth = Math.max(1, 1.5 * z);
        ctx.fillStyle = '#2a0a0a';
        ctx.fillRect(left, top, vialW, vialH);
        ctx.strokeRect(left, top, vialW, vialH);
        ctx.fillStyle = '#c03030';
        const fillInset = 1.5 * z;
        ctx.fillRect(left + fillInset, top + fillInset, vialW - 2 * fillInset, vialH - 2 * fillInset);
        ctx.restore();
    }

    _drawModifierTag(context, screenX, textBaselineY, text, color) {
        const { ctx, camera } = context;
        
        const fontSize = 11;
        const paddingH = 6;
        const paddingV = 3;
        ctx.font = `${fontSize}px sans-serif`;
        const tw = ctx.measureText(text).width;
        const pillW = tw + paddingH * 2;
        const pillH = fontSize + paddingV * 2;
        const pillX = screenX - pillW / 2;
        const pillY = textBaselineY - pillH;
        const radius = Math.min(pillH / 2, 8);
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(pillX, pillY, pillW, pillH, radius);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(pillX + radius, pillY);
            ctx.lineTo(pillX + pillW - radius, pillY);
            ctx.quadraticCurveTo(pillX + pillW, pillY, pillX + pillW, pillY + radius);
            ctx.lineTo(pillX + pillW, pillY + pillH - radius);
            ctx.quadraticCurveTo(pillX + pillW, pillY + pillH, pillX + pillW - radius, pillY + pillH);
            ctx.lineTo(pillX + radius, pillY + pillH);
            ctx.quadraticCurveTo(pillX, pillY + pillH, pillX, pillY + pillH - radius);
            ctx.lineTo(pillX, pillY + radius);
            ctx.quadraticCurveTo(pillX, pillY, pillX + radius, pillY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(text, screenX, textBaselineY);
        ctx.restore();
    }

    /** Draw stun indicator (three small stars in an arc) above an enemy's head. */
    _drawStunSymbol(context, screenX, symbolY, camera) {
        const { ctx } = context;
        const zoom = camera.zoom;
        const scale = 0.8;  // 20% smaller
        const r = (4 * scale) / zoom;
        const spread = (10 * scale) / zoom;
        const positions = [
            { x: screenX - spread, y: symbolY - (2 * scale) / zoom },
            { x: screenX, y: symbolY - (6 * scale) / zoom },
            { x: screenX + spread, y: symbolY - (2 * scale) / zoom }
        ];
        ctx.save();
        ctx.fillStyle = '#ffdd88';
        ctx.strokeStyle = '#cc9900';
        ctx.lineWidth = Math.max(1, (1.5 * scale) / zoom);
        for (const pos of positions) {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }

    _renderEntityEffects(context, entity, screenX, screenY) {
        const { ctx, canvas, camera, systems, settings } = context;
        const showPlayerHitboxIndicators = settings && settings.showPlayerHitboxIndicators !== false;

        const transform = entity.getComponent(Transform);
        const health = entity.getComponent(Health);
        const combat = entity.getComponent(Combat);
        const movement = entity.getComponent(Movement);
        const renderable = entity.getComponent(Renderable);
        const healing = entity.getComponent(PlayerHealing);
        const statusEffects = entity.getComponent(StatusEffects);

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(
            screenX,
            screenY + (transform.height / 2 + 5) * camera.zoom,
            (transform.width / 2) * camera.zoom,
            (transform.height / 4) * camera.zoom,
            0, 0, Math.PI * 2
        );
        ctx.fill();

        // Draw healing vial (player drinking) — after shadow so it appears in front
        this._drawHealingVialIfActive(context, entity, screenX, screenY, transform);

        // Draw health bar (player stun buildup is in corner UI under SP)
        const isPlayer = renderable && renderable.type === 'player';
        const barWidth = isPlayer ? 40 * camera.zoom : 30 * camera.zoom;
        const barHeight = isPlayer ? 5 * camera.zoom : 4 * camera.zoom;
        const barX = screenX - barWidth / 2;
        const barY = screenY - (transform.height + (isPlayer ? 10 : 8)) * camera.zoom;

        // Modifier labels above head for enemies (pack modifier, war cry, etc.) — sprite path
        if (!isPlayer && statusEffects) {
            const modifierLabels = [];
            if (statusEffects.packModifierName) {
                const packModifiers = GameConfig.packModifiers || {};
                const modDef = packModifiers[statusEffects.packModifierName];
                const color = modDef && modDef.color ? modDef.color : '#ffffff';
                const text = statusEffects.packModifierName.charAt(0).toUpperCase() + statusEffects.packModifierName.slice(1);
                modifierLabels.push({ text, color });
            }
            const now = performance.now() / 1000;
            if (statusEffects.buffedUntil != null && now < statusEffects.buffedUntil) {
                modifierLabels.push({ text: 'War Cry', color: '#ffaa00' });
            }
            if (modifierLabels.length > 0) {
                const lineHeight = 16;
                modifierLabels.forEach((item, i) => {
                    const labelY = barY - 2 * camera.zoom - i * lineHeight;
                    this._drawModifierTag(context, screenX, labelY, item.text, item.color);
                });
            }
        }

        // Stun duration bar (enemies only): white bar above health, depletes as stun runs out
        if (!isPlayer && statusEffects && statusEffects.stunDurationPercentRemaining > 0) {
            const gap = 2 * camera.zoom;
            const stunDurationBarHeight = 3 * camera.zoom;
            const stunDurationBarY = barY - stunDurationBarHeight - gap;
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, stunDurationBarY, barWidth, stunDurationBarHeight);
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1 / camera.zoom;
            ctx.strokeRect(barX, stunDurationBarY, barWidth, stunDurationBarHeight);
            const remain = statusEffects.stunDurationPercentRemaining;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(barX, stunDurationBarY, barWidth * remain, stunDurationBarHeight);
        }

        if (health && health.percent < 1) {
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            const healthPercent = health.percent;
            ctx.fillStyle = healthPercent > 0.5 ? '#44ff44' :
                                healthPercent > 0.25 ? '#ffff44' : '#ff4444';
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1 / camera.zoom;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        }

        // Under health: stamina bar for player, stun bar for enemies
        const stamina = entity.getComponent(Stamina);
        if (isPlayer && stamina) {
            const gap = 2 * camera.zoom;
            const underBarHeight = 4 * camera.zoom;
            const underBarY = barY + barHeight + gap;
            ctx.fillStyle = '#0f1520';
            ctx.fillRect(barX, underBarY, barWidth, underBarHeight);
            ctx.strokeStyle = '#2a3548';
            ctx.lineWidth = 1 / camera.zoom;
            ctx.strokeRect(barX, underBarY, barWidth, underBarHeight);
            ctx.fillStyle = '#2a5070';
            ctx.fillRect(barX, underBarY, barWidth * stamina.percent, underBarHeight);
        } else if (!isPlayer && statusEffects && statusEffects.hasBeenStunnedOnce && statusEffects.stunMeterPercent > 0) {
            const gap = 2 * camera.zoom;
            const stunBarHeight = 3 * camera.zoom;
            const stunBarY = barY + barHeight + gap;
            ctx.fillStyle = '#222';
            ctx.fillRect(barX, stunBarY, barWidth, stunBarHeight);
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1 / camera.zoom;
            ctx.strokeRect(barX, stunBarY, barWidth, stunBarHeight);
            const stunPercent = statusEffects.stunMeterPercent;
            ctx.fillStyle = stunPercent >= 1 ? '#ff6600' : '#ffaa00';
            ctx.fillRect(barX, stunBarY, barWidth * stunPercent, stunBarHeight);
        }

        // Stun symbol above enemy head (only after they've been stunned)
        if (!isPlayer && statusEffects && statusEffects.isStunned) {
            const barOffset = (transform.height + 10) * camera.zoom;
            const stunSymbolY = screenY - barOffset - (health && health.percent < 1 ? 14 * camera.zoom : 8 * camera.zoom);
            this._drawStunSymbol(context, screenX, stunSymbolY, camera);
        }

        // Player: attack arc, crossbow, sword, shield (only when character sprites are OFF and not healing — when ON, sprite art includes the weapon)
        if (renderable && renderable.type === 'player') {
            const useCharacterSprites = !settings || settings.useCharacterSprites !== false;
            const weapon = combat && combat.playerAttack ? combat.playerAttack.weapon : null;
            const isCrossbow = weapon && weapon.isRanged === true;
            const isMace = weapon && weapon.name === 'mace';
            const showWeapon = !healing || !healing.isHealing;
            if (!useCharacterSprites && showWeapon) {
                const isMeleeSpin = combat && combat.isAttacking && combat.currentAttackAnimationKey === 'meleeSpin';
                if (isMeleeSpin) {
                    ctx.save();
                    try {
                        ctx.translate(screenX, screenY);
                        const spinProgress = PlayerCombatRenderer.getSweepProgress(combat);
                        const pullBack = PlayerCombatRenderer.getAnticipationPullBack(combat);
                        ctx.rotate(Math.PI + pullBack + spinProgress * Math.PI * 2);
                        ctx.translate(-screenX, -screenY);
                        if (showPlayerHitboxIndicators && combat && combat.isAttacking && movement) {
                            PlayerCombatRenderer.drawAttackArc(ctx, screenX, screenY, combat, movement, camera, { comboColors: false });
                        }
                        if (isCrossbow && combat && movement && transform) {
                            PlayerCombatRenderer.drawCrossbow(ctx, screenX, screenY, transform, movement, combat, camera);
                        } else if (isMace && combat && movement && transform) {
                            PlayerCombatRenderer.drawMace(ctx, screenX, screenY, transform, movement, combat, camera);
                        } else if (combat && movement && transform) {
                            PlayerCombatRenderer.drawSword(ctx, screenX, screenY, transform, movement, combat, camera);
                            PlayerCombatRenderer.drawShield(ctx, screenX, screenY, transform, movement, combat, camera);
                        }
                    } finally {
                        ctx.restore();
                    }
                } else {
                    if (showPlayerHitboxIndicators && combat && combat.isAttacking && movement) {
                        PlayerCombatRenderer.drawAttackArc(ctx, screenX, screenY, combat, movement, camera, { comboColors: false });
                    }
                    if (isCrossbow && combat && movement && transform) {
                        PlayerCombatRenderer.drawCrossbow(ctx, screenX, screenY, transform, movement, combat, camera);
                    } else if (isMace && combat && movement && transform) {
                        PlayerCombatRenderer.drawMace(ctx, screenX, screenY, transform, movement, combat, camera);
                    } else if (combat && movement && transform) {
                        PlayerCombatRenderer.drawSword(ctx, screenX, screenY, transform, movement, combat, camera);
                        PlayerCombatRenderer.drawShield(ctx, screenX, screenY, transform, movement, combat, camera);
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
                ctx.fillStyle = '#1a1208';
                ctx.fillRect(pBarX, reloadBarY, pBarWidth, reloadBarHeight);
                ctx.strokeStyle = '#3d2817';
                ctx.lineWidth = 1 / camera.zoom;
                ctx.strokeRect(pBarX, reloadBarY, pBarWidth, reloadBarHeight);
                const progress = Math.min(1, entity.crossbowReloadProgress ?? 1);
                const perfectStart = crossbowConfig.perfectWindowStart;
                const perfectEnd = crossbowConfig.perfectWindowEnd;
                ctx.fillStyle = 'rgba(180, 220, 100, 0.4)';
                ctx.fillRect(pBarX + pBarWidth * perfectStart, reloadBarY, pBarWidth * (perfectEnd - perfectStart), reloadBarHeight);
                ctx.strokeStyle = 'rgba(200, 255, 120, 0.6)';
                ctx.lineWidth = 1 / camera.zoom;
                ctx.strokeRect(pBarX + pBarWidth * perfectStart, reloadBarY, pBarWidth * (perfectEnd - perfectStart), reloadBarHeight);
                ctx.fillStyle = '#4a6040';
                ctx.fillRect(pBarX, reloadBarY, pBarWidth * progress, reloadBarHeight);
            }
            // Stun duration bar only in corner UI (under SP), not in-world
            // Charge attack meter (sprite path + sanctuary): vertical bar on left of player when holding attack
            const inputSystem = systems ? systems.get('input') : null;
            const chargeAttackConfig = combat && combat.playerAttack ? combat.playerAttack.weapon.chargeAttack : null;
            if (inputSystem && inputSystem.isCharging && transform && chargeAttackConfig) {
                const chargeDuration = inputSystem.getChargeDuration();
                const maxChargeTime = chargeAttackConfig.maxChargeTime;
                const minChargeTime = chargeAttackConfig.minChargeTime;
                if (chargeDuration >= minChargeTime) {
                    const chargeProgress = Math.min(1.0, (chargeDuration - minChargeTime) / (maxChargeTime - minChargeTime));
                    const meterWidth = 6 * camera.zoom;
                    const meterHeight = 40 * camera.zoom;
                    const meterX = screenX - (transform.width / 2 + 15) * camera.zoom;
                    const meterY = screenY - meterHeight / 2;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    ctx.fillRect(meterX - 1, meterY - 1, meterWidth + 2, meterHeight + 2);
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1 / camera.zoom;
                    ctx.strokeRect(meterX, meterY, meterWidth, meterHeight);
                    const fillHeight = meterHeight * chargeProgress;
                    const fillY = meterY + meterHeight - fillHeight;
                    const gradient = ctx.createLinearGradient(meterX, meterY + meterHeight, meterX, meterY);
                    gradient.addColorStop(0, '#ffff00');
                    gradient.addColorStop(0.5, '#ff8800');
                    gradient.addColorStop(1, '#ff0000');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(meterX, fillY, meterWidth, fillHeight);
                }
            }
        }
    }


    _renderPlayer(context, entity, screenX, screenY) {
        const { ctx, canvas, camera, systems, settings } = context;
        const showPlayerHitboxIndicators = settings && settings.showPlayerHitboxIndicators !== false;

        const transform = entity.getComponent(Transform);
        const movement = entity.getComponent(Movement);
        const combat = entity.getComponent(Combat);
        const health = entity.getComponent(Health);
        const renderable = entity.getComponent(Renderable);
        const healing = entity.getComponent(PlayerHealing);
        const showWeapon = !healing || !healing.isHealing;
        const inputSystem = systems ? systems.get('input') : null;
        const weapon = combat && combat.playerAttack ? combat.playerAttack.weapon : null;
        const isCrossbow = weapon && weapon.isRanged === true;
        const isMace = weapon && weapon.name === 'mace';

        // Draw path if following one
        if (movement && movement.path.length > 0) {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.lineWidth = 2 / camera.zoom;
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            
            for (let i = movement.pathIndex; i < movement.path.length; i++) {
                const waypoint = movement.path[i];
                const wpScreenX = camera.toScreenX(waypoint.x);
                const wpScreenY = camera.toScreenY(waypoint.y);
                ctx.lineTo(wpScreenX, wpScreenY);
            }
            ctx.stroke();
        }

        const isMeleeSpin = combat && combat.isAttacking && combat.currentAttackAnimationKey === 'meleeSpin';
        // Single formula for spin: sweep progress * 2π, with ease-in over first 8% so standing→spin has no snap
        const spinProgress = isMeleeSpin ? PlayerCombatRenderer.getSweepProgress(combat) : 0;
        const raw = isMeleeSpin && combat.attackDuration > 0 ? Math.min(1, (combat.attackTimer || 0) / combat.attackDuration) : 0;
        const rotationBlend = raw < 0.08 ? Utils.easeInQuad(raw / 0.08) : 1;
        const outerRotation = spinProgress * rotationBlend * Math.PI * 2;

        ctx.save();
        try {
            // Reset canvas state so we never inherit from other entities (avoids blink when switching to/from spin)
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            ctx.translate(screenX, screenY);
            ctx.rotate(outerRotation);
            ctx.translate(-screenX, -screenY);
            if (showPlayerHitboxIndicators && combat && combat.isAttacking) {
                PlayerCombatRenderer.drawAttackArc(ctx, screenX, screenY, combat, movement, camera, { comboColors: true });
            }
            // Draw shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.ellipse(
                screenX,
                screenY + (transform.height / 2 + 6) * camera.zoom,
                (transform.width * 0.65) * camera.zoom,
                (transform.height / 3.5) * camera.zoom,
                0, 0, Math.PI * 2
            );
            ctx.fill();
            // Sword handle (pommel + grip) under helmet for correct layering
            if (showWeapon && !isCrossbow && !isMace) {
                PlayerCombatRenderer.drawSword(ctx, screenX, screenY, transform, movement, combat, camera, { part: 'handle' });
            }
            const isDodging = movement && movement.isDodging;
            const w = transform.width * camera.zoom;
            const h = transform.height * camera.zoom;
            if (isDodging) ctx.globalAlpha = 0.6;
            const lw = Math.max(1, 2 / camera.zoom);
            ctx.lineWidth = lw;
            const steel = isDodging ? '#707080' : (combat && combat.isAttacking ? '#9a8b8b' : '#8b8b9a');
            const steelDark = '#5a5a68';
            const steelDarker = '#4a4a58';
            const facingAngle = movement ? movement.facingAngle : 0;
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(facingAngle);
            const helmetRx = w * 0.42;
            const helmetRy = w * 0.38;
            const paulOffsetY = helmetRy * 0.72;
            const paulRx = w * 0.22;
            const paulRy = w * 0.28;
            ctx.fillStyle = steel;
            ctx.strokeStyle = steelDarker;
            ctx.lineWidth = lw;
            ctx.beginPath();
            ctx.ellipse(0, paulOffsetY, paulRx, paulRy, 0, 0, Math.PI * 2);
            ctx.ellipse(0, -paulOffsetY, paulRx, paulRy, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = isDodging ? '#505060' : steelDark;
            ctx.strokeStyle = steelDarker;
            ctx.beginPath();
            ctx.ellipse(0, 0, helmetRx, helmetRy, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.lineWidth = Math.max(1.5, lw * 1.2);
            ctx.beginPath();
            ctx.moveTo(helmetRx * 0.35, 0);
            ctx.lineTo(helmetRx * 0.95, 0);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = lw * 0.5;
            ctx.beginPath();
            ctx.moveTo(-helmetRx * 0.5, 0);
            ctx.lineTo(helmetRx * 0.5, 0);
            ctx.stroke();
            ctx.restore();
            ctx.globalAlpha = 1.0;
            if (showWeapon) {
                if (isCrossbow) {
                    PlayerCombatRenderer.drawCrossbow(ctx, screenX, screenY, transform, movement, combat, camera);
                } else if (isMace) {
                    PlayerCombatRenderer.drawMace(ctx, screenX, screenY, transform, movement, combat, camera);
                } else {
                    // Blade + guard drawn on top of helmet (handle was drawn under helmet above)
                    PlayerCombatRenderer.drawSword(ctx, screenX, screenY, transform, movement, combat, camera, { part: 'blade' });
                    PlayerCombatRenderer.drawShield(ctx, screenX, screenY, transform, movement, combat, camera);
                }
            }
        } finally {
            ctx.restore();
        }

        // Draw healing vial when drinking (non-sprite path doesn't call renderEntityEffects)
        this._drawHealingVialIfActive(context, entity, screenX, screenY, transform);

        // Draw health bar
        if (health) {
            const barWidth = 40 * camera.zoom;
            const barHeight = 5 * camera.zoom;
            const barX = screenX - barWidth / 2;
            const barY = screenY - (transform.height + 10) * camera.zoom;
            const statusEffects = entity.getComponent(StatusEffects);

            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            const healthPercent = health.percent;
            ctx.fillStyle = healthPercent > 0.5 ? '#44ff44' : 
                                healthPercent > 0.25 ? '#ffff44' : '#ff4444';
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1 / camera.zoom;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
            
            ctx.textAlign = 'left';

            let barsBottomY = barY + barHeight + (3 * camera.zoom);
            const stamina = entity.getComponent(Stamina);
            if (stamina) {
                const gap = 3 * camera.zoom;
                const staminaBarHeight = 4 * camera.zoom;
                const staminaBarY = barY + barHeight + gap;
                barsBottomY = staminaBarY + staminaBarHeight + gap;
                ctx.fillStyle = '#0f1520';
                ctx.fillRect(barX, staminaBarY, barWidth, staminaBarHeight);
                ctx.strokeStyle = '#2a3548';
                ctx.strokeRect(barX, staminaBarY, barWidth, staminaBarHeight);
                const staminaPercent = stamina.percent;
                ctx.fillStyle = '#2a5070';
                ctx.fillRect(barX, staminaBarY, barWidth * staminaPercent, staminaBarHeight);
            }

            // Crossbow reload bar: under health (and stamina bar) — always show when crossbow equipped
            const crossbowConfig = GameConfig.player.crossbow;
            if (isCrossbow && crossbowConfig) {
                const reloadBarHeight = 4 * camera.zoom;
                const reloadBarY = barsBottomY;
                const reloadBarX = barX;
                const reloadBarW = barWidth;

                ctx.fillStyle = '#1a1208';
                ctx.fillRect(reloadBarX, reloadBarY, reloadBarW, reloadBarHeight);
                ctx.strokeStyle = '#3d2817';
                ctx.lineWidth = 1 / camera.zoom;
                ctx.strokeRect(reloadBarX, reloadBarY, reloadBarW, reloadBarHeight);

                const progress = Math.min(1, entity.crossbowReloadProgress ?? 1);
                const perfectStart = crossbowConfig.perfectWindowStart;
                const perfectEnd = crossbowConfig.perfectWindowEnd;

                ctx.fillStyle = 'rgba(180, 220, 100, 0.4)';
                ctx.fillRect(
                    reloadBarX + reloadBarW * perfectStart,
                    reloadBarY,
                    reloadBarW * (perfectEnd - perfectStart),
                    reloadBarHeight
                );
                ctx.strokeStyle = 'rgba(200, 255, 120, 0.6)';
                ctx.lineWidth = 1 / camera.zoom;
                ctx.strokeRect(
                    reloadBarX + reloadBarW * perfectStart,
                    reloadBarY,
                    reloadBarW * (perfectEnd - perfectStart),
                    reloadBarHeight
                );

                ctx.fillStyle = '#4a6040';
                ctx.fillRect(reloadBarX, reloadBarY, reloadBarW * progress, reloadBarHeight);
                barsBottomY = reloadBarY + reloadBarHeight;
            }

            // Stun duration bar only in corner UI (under SP), not in-world
        }
        
        // Render charge meter if charging (vertical bar on left side of player)
        const chargeAttackConfig = combat && combat.playerAttack ? combat.playerAttack.weapon.chargeAttack : null;
        if (inputSystem && inputSystem.isCharging && chargeAttackConfig) {
            const chargeDuration = inputSystem.getChargeDuration();
            const maxChargeTime = chargeAttackConfig.maxChargeTime;
            const minChargeTime = chargeAttackConfig.minChargeTime;
            
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
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(meterX - 1, meterY - 1, meterWidth + 2, meterHeight + 2);
            
            // Draw meter border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1 / camera.zoom;
            ctx.strokeRect(meterX, meterY, meterWidth, meterHeight);
            
            // Draw charge fill (from bottom to top)
            const fillHeight = meterHeight * chargeProgress;
            const fillY = meterY + meterHeight - fillHeight;
            
            // Gradient from yellow (bottom) to orange to red (top)
            const gradient = ctx.createLinearGradient(meterX, meterY + meterHeight, meterX, meterY);
            gradient.addColorStop(0, '#ffff00'); // Yellow (bottom)
            gradient.addColorStop(0.5, '#ff8800'); // Orange
            gradient.addColorStop(1, '#ff0000'); // Red (top)
            
            ctx.fillStyle = gradient;
            ctx.fillRect(meterX, fillY, meterWidth, fillHeight);
        }
    }

    _renderEnemy(context, entity, screenX, screenY) {
        const { ctx, canvas, camera, systems, settings } = context;
        const showEnemyHitboxIndicators = settings && settings.showEnemyHitboxIndicators !== false;

        const transform = entity.getComponent(Transform);
        const movement = entity.getComponent(Movement);
        const combat = entity.getComponent(Combat);
        const health = entity.getComponent(Health);
        const renderable = entity.getComponent(Renderable);
        const ai = entity.getComponent(AI);

        // Draw pillar-of-flame telegraph (circle at player position while demon is casting)
        if (ai && ai.isCastingPillar) {
            const player = systems && systems.get('entities') ? systems.get('entities').get('player') : null;
            const playerTransform = player ? player.getComponent(Transform) : null;
            if (playerTransform) {
                const pillarConfig = GameConfig.enemy.types.greaterDemon && GameConfig.enemy.types.greaterDemon.pillarFlame;
                const radius = (pillarConfig && pillarConfig.radius ? pillarConfig.radius : 45) * camera.zoom;
                const telegraphX = camera.toScreenX(playerTransform.x);
                const telegraphY = camera.toScreenY(playerTransform.y);
                const progress = pillarConfig && pillarConfig.castDelay ? 1 - (ai.pillarCastTimer / pillarConfig.castDelay) : 0;
                ctx.strokeStyle = 'rgba(255, 120, 40, 0.6)';
                ctx.lineWidth = 2 / camera.zoom;
                ctx.setLineDash([4 / camera.zoom, 4 / camera.zoom]);
                ctx.beginPath();
                ctx.arc(telegraphX, telegraphY, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = 'rgba(200, 80, 30, 0.15)';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(telegraphX, telegraphY, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
                ctx.lineTo(telegraphX, telegraphY);
                ctx.closePath();
                ctx.fillStyle = 'rgba(255, 100, 40, 0.25)';
                ctx.fill();
            }
        }

        // Draw demon claw cone (arc in front of demon) – infernal iron
        if (showEnemyHitboxIndicators && combat && combat.demonAttack && combat.isAttacking) {
            const range = (combat.attackRange || 70) * camera.zoom;
            const arc = combat.attackArc != null ? combat.attackArc : Utils.degToRad(100);
            const facingAngle = movement ? movement.facingAngle : 0;
            const halfArc = arc / 2;
            const startAngle = facingAngle - halfArc;
            const endAngle = facingAngle + halfArc;
            ctx.fillStyle = 'rgba(60, 20, 20, 0.28)';
            ctx.beginPath();
            ctx.arc(screenX, screenY, range, startAngle, endAngle);
            ctx.lineTo(screenX, screenY);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#4a2020';
            ctx.lineWidth = 3 / camera.zoom;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(140, 50, 50, 0.7)';
            ctx.lineWidth = Math.max(1, 1.5 / camera.zoom);
            ctx.beginPath();
            ctx.arc(screenX, screenY, range - 3 / camera.zoom, startAngle, endAngle);
            ctx.stroke();
        }

        // Draw chieftain heavy smash cone (arc in front) – dark green / bronze
        if (showEnemyHitboxIndicators && combat && combat.chieftainAttack && combat.isAttacking) {
            const range = (combat.attackRange || 86) * camera.zoom;
            const arc = combat.attackArc != null ? combat.attackArc : Utils.degToRad(90);
            const facingAngle = movement ? movement.facingAngle : 0;
            const halfArc = arc / 2;
            const startAngle = facingAngle - halfArc;
            const endAngle = facingAngle + halfArc;
            const chargeProgress = combat.chieftainAttack.chargeProgress || 0;
            ctx.fillStyle = `rgba(30, 45, 25, ${0.15 + chargeProgress * 0.2})`;
            ctx.beginPath();
            ctx.arc(screenX, screenY, range, startAngle, endAngle);
            ctx.lineTo(screenX, screenY);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(60, 80, 40, 0.8)';
            ctx.lineWidth = 3 / camera.zoom;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(120, 100, 50, 0.7)';
            ctx.lineWidth = Math.max(1, 1.5 / camera.zoom);
            ctx.beginPath();
            ctx.arc(screenX, screenY, range - 3 / camera.zoom, startAngle, endAngle);
            ctx.stroke();
        }

        // Draw lunge charge indicator
        if (showEnemyHitboxIndicators && ai && ai.isChargingLunge) {
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
                ctx.strokeStyle = `rgba(120, 40, 35, ${alpha})`;
                ctx.lineWidth = 4 / camera.zoom;
                ctx.beginPath();
                ctx.arc(screenX, screenY, pulseSize, 0, Math.PI * 2);
                ctx.stroke();
                ctx.strokeStyle = `rgba(160, 80, 40, ${0.5 + chargeProgress * 0.4})`;
                ctx.lineWidth = 3 / camera.zoom;
                ctx.beginPath();
                ctx.arc(screenX, screenY, (transform.width / 2 + 5) * camera.zoom, 0, Math.PI * 2 * chargeProgress);
                ctx.stroke();
            }
        }

        // Draw wind-up indicator (12 principles: anticipation, staging, timing)
        if (showEnemyHitboxIndicators && combat && combat.isWindingUp) {
            const visualProgress = EnemyCombatRenderer.getWindUpVisualProgress(combat);
            const dangerPhase = EnemyCombatRenderer.getWindUpDangerPhase(combat);
            const facingAngle = movement ? movement.facingAngle : 0;
            const arc = combat.attackArc != null ? combat.attackArc : Utils.degToRad(90);
            const halfArc = arc / 2;
            const range = combat.attackRange * camera.zoom;
            const startAngle = facingAngle - halfArc;
            const endAngle = facingAngle + halfArc;

            // Pulsing circle: eased so it grows more in the last part of wind-up (anticipation)
            const pulseSize = (transform.width / 2 + 5) * camera.zoom * (1 + visualProgress * 0.4);
            const alpha = 0.5 - visualProgress * 0.35;
            ctx.strokeStyle = dangerPhase > 0
                ? `rgba(200, 80, 50, ${0.5 + dangerPhase * 0.5})`
                : `rgba(140, 100, 50, ${alpha})`;
            ctx.lineWidth = dangerPhase > 0 ? (3 + dangerPhase * 2) / camera.zoom : 3 / camera.zoom;
            ctx.beginPath();
            ctx.arc(screenX, screenY, pulseSize, 0, Math.PI * 2);
            ctx.stroke();

            // Attack cone: eased fade-in so danger zone becomes obvious late (staging)
            ctx.fillStyle = `rgba(35, 30, 28, ${visualProgress * 0.28})`;
            ctx.beginPath();
            ctx.arc(screenX, screenY, range, startAngle, endAngle);
            ctx.lineTo(screenX, screenY);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = dangerPhase > 0
                ? `rgba(180, 70, 50, ${0.5 + dangerPhase * 0.5})`
                : `rgba(80, 70, 60, ${visualProgress * 0.8})`;
            ctx.lineWidth = dangerPhase > 0 ? (2 + dangerPhase * 1.5) / camera.zoom : 2 / camera.zoom;
            ctx.stroke();
            // Danger phase: red rim inside cone so "about to strike" is unmistakable
            if (dangerPhase > 0) {
                ctx.strokeStyle = `rgba(220, 60, 40, ${dangerPhase * 0.9})`;
                ctx.lineWidth = Math.max(1, 2.5 / camera.zoom);
                ctx.beginPath();
                ctx.arc(screenX, screenY, range - 4 / camera.zoom, startAngle, endAngle);
                ctx.stroke();
            }
        }

        // Draw attack indicator (strike moment – clear "attack out" so timing is readable)
        if (showEnemyHitboxIndicators && combat && combat.isAttacking && !combat.isWindingUp && !combat.demonAttack && !combat.chieftainAttack) {
            const facingAngle = movement ? movement.facingAngle : 0;
            const arc = combat.attackArc != null ? combat.attackArc : Utils.degToRad(90);
            const halfArc = arc / 2;
            const range = combat.attackRange * camera.zoom;
            const startAngle = facingAngle - halfArc;
            const endAngle = facingAngle + halfArc;
            ctx.fillStyle = 'rgba(50, 40, 35, 0.32)';
            ctx.beginPath();
            ctx.arc(screenX, screenY, range, startAngle, endAngle);
            ctx.lineTo(screenX, screenY);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#5a4a52';
            ctx.lineWidth = 4 / camera.zoom;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(200, 140, 100, 0.85)';
            ctx.lineWidth = Math.max(1, 2 / camera.zoom);
            ctx.beginPath();
            ctx.arc(screenX, screenY, range - 3 / camera.zoom, startAngle, endAngle);
            ctx.stroke();
        }

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(
            screenX,
            screenY + (transform.height / 2 + 5) * camera.zoom,
            (transform.width / 2) * camera.zoom,
            (transform.height / 4) * camera.zoom,
            0, 0, Math.PI * 2
        );
        ctx.fill();

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
            const intensity = EnemyCombatRenderer.getWindUpVisualProgress(combat);
            bodyColor = `rgba(255, ${Math.floor(100 + (1 - intensity) * 100)}, ${Math.floor(50 + (1 - intensity) * 50)}, 1)`;
        } else if (combat && combat.isLunging) {
            bodyColor = '#ff0000';
        }

        const sizeMultiplier = combat && combat.isWindingUp ? (1 + EnemyCombatRenderer.getWindUpVisualProgress(combat) * 0.12) : 1;
        const r = (transform.width / 2) * camera.zoom * sizeMultiplier;
        const h = (transform.height / 2) * camera.zoom * sizeMultiplier;
        const enemyType = ai && ai.enemyType ? ai.enemyType : 'goblin';
        const strokeColor = (combat && (combat.isWindingUp || combat.isAttacking)) ? '#ff0000' : (ai && ai.state === 'attack') ? '#ff0000' : '#000000';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2 / camera.zoom;

        if (enemyType === 'goblin') {
            // Goblin: hunched oval body, pointy ears, small eyes
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.ellipse(screenX, screenY + h * 0.15, r * 0.95, h * 1.0, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = bodyColor;
            ctx.strokeStyle = strokeColor;
            ctx.beginPath();
            ctx.moveTo(screenX - r * 0.6, screenY - h * 0.6);
            ctx.lineTo(screenX - r * 0.95, screenY - h * 1.15);
            ctx.lineTo(screenX - r * 0.35, screenY - h * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(screenX + r * 0.6, screenY - h * 0.6);
            ctx.lineTo(screenX + r * 0.95, screenY - h * 1.15);
            ctx.lineTo(screenX + r * 0.35, screenY - h * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            const eyeSize = 2.5 / camera.zoom;
            ctx.fillStyle = ai && ai.state === 'chase' ? '#ff3300' : '#1a1a0a';
            ctx.beginPath();
            ctx.arc(screenX - r * 0.35, screenY - h * 0.2, eyeSize, 0, Math.PI * 2);
            ctx.arc(screenX + r * 0.35, screenY - h * 0.2, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        } else if (enemyType === 'goblinChieftain') {
            // Goblin Chieftain: larger goblin, darker green, crown/helmet
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.ellipse(screenX, screenY + h * 0.12, r * 1.0, h * 1.05, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = bodyColor;
            ctx.strokeStyle = strokeColor;
            ctx.beginPath();
            ctx.moveTo(screenX - r * 0.55, screenY - h * 0.55);
            ctx.lineTo(screenX - r * 0.9, screenY - h * 1.05);
            ctx.lineTo(screenX - r * 0.3, screenY - h * 0.45);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(screenX + r * 0.55, screenY - h * 0.55);
            ctx.lineTo(screenX + r * 0.9, screenY - h * 1.05);
            ctx.lineTo(screenX + r * 0.3, screenY - h * 0.45);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Crown / helmet (gold-brown)
            ctx.fillStyle = '#8b7355';
            ctx.strokeStyle = '#5c4a38';
            ctx.lineWidth = 2 / camera.zoom;
            ctx.beginPath();
            ctx.moveTo(screenX - r * 0.5, screenY - h * 0.95);
            ctx.lineTo(screenX - r * 0.2, screenY - h * 1.25);
            ctx.lineTo(screenX, screenY - h * 1.15);
            ctx.lineTo(screenX + r * 0.2, screenY - h * 1.25);
            ctx.lineTo(screenX + r * 0.5, screenY - h * 0.95);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            const eyeSize = 2.8 / camera.zoom;
            ctx.fillStyle = ai && ai.state === 'chase' ? '#ff3300' : '#1a1a0a';
            ctx.beginPath();
            ctx.arc(screenX - r * 0.32, screenY - h * 0.18, eyeSize, 0, Math.PI * 2);
            ctx.arc(screenX + r * 0.32, screenY - h * 0.18, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        } else if (enemyType === 'lesserDemon') {
            // Lesser demon: similar to goblin but darker/more demonic
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.ellipse(screenX, screenY, r * 0.85, h * 0.9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#3a1a1a';
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2 / camera.zoom;
            ctx.beginPath();
            ctx.moveTo(screenX - r * 0.6, screenY - h * 0.6);
            ctx.lineTo(screenX - r * 0.95, screenY - h * 1.15);
            ctx.lineTo(screenX - r * 0.35, screenY - h * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(screenX + r * 0.6, screenY - h * 0.6);
            ctx.lineTo(screenX + r * 0.95, screenY - h * 1.15);
            ctx.lineTo(screenX + r * 0.35, screenY - h * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            const eyeSize = 2.5 / camera.zoom;
            ctx.fillStyle = ai && ai.state === 'chase' ? '#ff4400' : '#2a0a0a';
            ctx.beginPath();
            ctx.arc(screenX - r * 0.35, screenY - h * 0.2, eyeSize, 0, Math.PI * 2);
            ctx.arc(screenX + r * 0.35, screenY - h * 0.2, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        } else if (enemyType === 'skeleton') {
            // Skeleton: skull shape, dark sockets, bony
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.ellipse(screenX, screenY, r * 0.9, h * 0.95, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#2a2520';
            ctx.beginPath();
            ctx.ellipse(screenX - r * 0.28, screenY - h * 0.15, r * 0.2, h * 0.25, 0, 0, Math.PI * 2);
            ctx.ellipse(screenX + r * 0.28, screenY - h * 0.15, r * 0.2, h * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#1a1510';
            ctx.lineWidth = 1 / camera.zoom;
            ctx.stroke();
            ctx.lineWidth = 2 / camera.zoom;
            ctx.strokeStyle = strokeColor;
            ctx.beginPath();
            ctx.moveTo(screenX - r * 0.25, screenY + h * 0.4);
            ctx.lineTo(screenX, screenY + h * 0.75);
            ctx.lineTo(screenX + r * 0.25, screenY + h * 0.4);
            ctx.stroke();
        } else if (enemyType === 'greaterDemon') {
            // Greater demon: broad muscular torso, swept horns, shoulder mass, glowing eyes, tail
            const dr = r * 1.0;
            const dh = h * 1.05;
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.ellipse(screenX, screenY, dr * 1.15, dh * 1.0, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#2a0a12';
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2 / camera.zoom;
            ctx.beginPath();
            ctx.moveTo(screenX - dr * 0.4, screenY - dh * 0.5);
            ctx.quadraticCurveTo(screenX - dr * 0.9, screenY - dh * 1.2, screenX - dr * 0.55, screenY - dh * 0.35);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(screenX + dr * 0.4, screenY - dh * 0.5);
            ctx.quadraticCurveTo(screenX + dr * 0.9, screenY - dh * 1.2, screenX + dr * 0.55, screenY - dh * 0.35);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#1a0508';
            ctx.beginPath();
            ctx.moveTo(screenX, screenY + dh * 0.6);
            ctx.lineTo(screenX + 4 / camera.zoom, screenY + dh * 1.15);
            ctx.lineTo(screenX - 4 / camera.zoom, screenY + dh * 1.15);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            const eyeSize = 4 / camera.zoom;
            ctx.fillStyle = ai && ai.state === 'chase' ? '#ff2222' : '#ff5533';
            ctx.shadowColor = ai && ai.state === 'chase' ? '#ff4444' : 'rgba(255, 80, 50, 0.8)';
            ctx.shadowBlur = 6 / camera.zoom;
            ctx.beginPath();
            ctx.arc(screenX - dr * 0.3, screenY - dh * 0.12, eyeSize, 0, Math.PI * 2);
            ctx.arc(screenX + dr * 0.3, screenY - dh * 0.12, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            const eyeSize = 2 / camera.zoom;
            const eyeOffset = 5 * camera.zoom;
            ctx.fillStyle = ai && ai.state === 'chase' ? '#ff0000' : '#ffffff';
            ctx.beginPath();
            ctx.arc(screenX - eyeOffset, screenY - eyeOffset, eyeSize, 0, Math.PI * 2);
            ctx.arc(screenX + eyeOffset, screenY - eyeOffset, eyeSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw health bar
        const barWidth = 30 * camera.zoom;
        const barHeight = 4 * camera.zoom;
        const barX = screenX - barWidth / 2;
        const barY = screenY - (transform.height + 8) * camera.zoom;

        // Modifier labels above head (pack modifier, war cry, etc.)
        const statusEffectsForLabels = entity.getComponent(StatusEffects);
        const modifierLabels = [];
        if (statusEffectsForLabels) {
            if (statusEffectsForLabels.packModifierName) {
                const packModifiers = GameConfig.packModifiers || {};
                const modDef = packModifiers[statusEffectsForLabels.packModifierName];
                const color = modDef && modDef.color ? modDef.color : '#ffffff';
                const text = statusEffectsForLabels.packModifierName.charAt(0).toUpperCase() + statusEffectsForLabels.packModifierName.slice(1);
                modifierLabels.push({ text, color });
            }
            const now = performance.now() / 1000;
            if (statusEffectsForLabels.buffedUntil != null && now < statusEffectsForLabels.buffedUntil) {
                modifierLabels.push({ text: 'War Cry', color: '#ffaa00' });
            }
        }
        if (modifierLabels.length > 0) {
            const lineHeight = 16;
            modifierLabels.forEach((item, i) => {
                const labelY = barY - 2 * camera.zoom - i * lineHeight;
                this._drawModifierTag(context, screenX, labelY, item.text, item.color);
            });
        }

        // Stun duration bar: white bar above health, depletes as stun runs out
        const statusEffects = entity.getComponent(StatusEffects);
        if (statusEffects && statusEffects.stunDurationPercentRemaining > 0) {
            const gap = 2 * camera.zoom;
            const stunDurationBarHeight = 3 * camera.zoom;
            const stunDurationBarY = barY - stunDurationBarHeight - gap;
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, stunDurationBarY, barWidth, stunDurationBarHeight);
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1 / camera.zoom;
            ctx.strokeRect(barX, stunDurationBarY, barWidth, stunDurationBarHeight);
            const remain = statusEffects.stunDurationPercentRemaining;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(barX, stunDurationBarY, barWidth * remain, stunDurationBarHeight);
        }

        if (health && health.percent < 1) {
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            const healthPercent = health.percent;
            ctx.fillStyle = healthPercent > 0.5 ? '#44ff44' :
                                healthPercent > 0.25 ? '#ffff44' : '#ff4444';
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1 / camera.zoom;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        }

        // Stun bar under health bar (only show after enemy has been stunned at least once)
        if (statusEffects && statusEffects.hasBeenStunnedOnce && statusEffects.stunMeterPercent > 0) {
            const gap = 2 * camera.zoom;
            const stunBarHeight = 3 * camera.zoom;
            const stunBarY = barY + barHeight + gap;
            ctx.fillStyle = '#222';
            ctx.fillRect(barX, stunBarY, barWidth, stunBarHeight);
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1 / camera.zoom;
            ctx.strokeRect(barX, stunBarY, barWidth, stunBarHeight);
            const stunPercent = statusEffects.stunMeterPercent;
            ctx.fillStyle = stunPercent >= 1 ? '#ff6600' : '#ffaa00';
            ctx.fillRect(barX, stunBarY, barWidth * stunPercent, stunBarHeight);
        }

        // Stun symbol above enemy head
        if (statusEffects && statusEffects.isStunned) {
            const barOffset = (transform.height + 8) * camera.zoom;
            const stunSymbolY = screenY - barOffset - (health && health.percent < 1 ? 14 * camera.zoom : 8 * camera.zoom);
            this._drawStunSymbol(context, screenX, stunSymbolY, camera);
        }
    }
}

if (typeof window !== 'undefined') {
    window.EntityLayerRenderer = EntityLayerRenderer;
}
