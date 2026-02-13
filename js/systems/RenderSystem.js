// Render System - orchestrates layer renderers. Same public API for Game.js.
class RenderSystem {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.settings = null;
        this.worldLayer = new WorldLayerRenderer();
        this.obstacleLayer = new ObstacleLayerRenderer();
        this.portalRenderer = new PortalRenderer();
        this.boardRenderer = new BoardRenderer();
        this.chestRenderer = new ChestRenderer();
        this.entityLayer = new EntityLayerRenderer();
        this.minimapRenderer = new MinimapRenderer();
    }

    init(systems) {
        this.systems = systems;
    }

    clear() {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    _getContext(camera) {
        return createRenderContext(this.ctx, this.canvas, camera, this.systems, this.settings);
    }

    renderWorld(camera, obstacleManager, currentLevel = 1, worldWidth = null, worldHeight = null, playerY = null) {
        const context = this._getContext(camera);
        this.worldLayer.render(context, { currentLevel, worldWidth, worldHeight });
        if (obstacleManager) {
            const phase = typeof playerY === 'number' ? 'behind' : 'all';
            this.obstacleLayer.render(context, { obstacleManager, currentLevel, playerY, phase });
        }
    }

    /** Draw only trees (and other depth-sorted obstacles) that are in front of the player. Call after renderEntities. */
    renderObstaclesInFront(camera, obstacleManager, currentLevel = 1, playerY = null) {
        if (!obstacleManager || typeof playerY !== 'number') return;
        this.obstacleLayer.render(this._getContext(camera), { obstacleManager, currentLevel, playerY, phase: 'front' });
    }

    renderPortal(portal, camera, playerNearPortal) {
        this.portalRenderer.render(this._getContext(camera), { portal, playerNearPortal });
    }

    renderPortalInteractionPrompt(portal, camera, showPrompt) {
        this.portalRenderer.render(this._getContext(camera), { portal, playerNearPortal: showPrompt });
    }

    renderBoard(board, camera, playerNearBoard) {
        this.boardRenderer.render(this._getContext(camera), { board, playerNearBoard });
    }

    renderBoardInteractionPrompt(board, camera, showPrompt) {
        this.boardRenderer.render(this._getContext(camera), { board, playerNearBoard: showPrompt });
    }

    renderChest(chest, camera, playerNearChest) {
        this.chestRenderer.render(this._getContext(camera), { chest, playerNearChest });
    }

    renderChestInteractionPrompt(chest, camera, showPrompt) {
        this.chestRenderer.render(this._getContext(camera), { chest, playerNearChest: showPrompt });
    }

    renderEntities(entities, camera) {
        this.entityLayer.render(this._getContext(camera), { entities });
    }

    renderMinimap(camera, entityManager, worldWidth, worldHeight, portal = null, currentLevel = 1) {
        this.minimapRenderer.render(this._getContext(camera), {
            entityManager,
            worldWidth,
            worldHeight,
            portal,
            currentLevel
        });
    }
}
