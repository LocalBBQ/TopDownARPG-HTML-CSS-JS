// Entity layer: orchestrator only. Delegates to EntitySpriteRenderer, EnemyEntityRenderer, PlayerEntityRenderer.
// Shared effects (shadow, vial, tags, bars) in EntityEffectsRenderer.js.
// See ENTITY_LAYER_REFACTOR.md for structure.
class EntityLayerRenderer {
    constructor() {
        this._spriteRenderer = null;
    }

    render(context, data) {
        const { entities } = data;
        if (!entities) return;

        const { ctx, canvas, camera, systems, settings } = context;
        const spriteManager = systems ? systems.get('sprites') : null;
        const useCharacterSprites = !settings || settings.useCharacterSprites !== false;
        let playerDraw = null;

        for (const entity of entities) {
            if (!entity.active) continue;
            const transform = entity.getComponent(Transform);
            const renderable = entity.getComponent(Renderable);
            if (!transform || !renderable) continue;
            const screenX = camera.toScreenX(transform.x);
            const screenY = camera.toScreenY(transform.y);
            if (screenX < -50 || screenX > canvas.width + 50 || screenY < -50 || screenY > canvas.height + 50) continue;

            if (renderable.type === 'player') {
                playerDraw = { entity, screenX, screenY };
                continue;
            }

            const sprite = entity.getComponent(Sprite);
            const isCharacter = renderable.type === 'enemy';
            try {
                if (sprite && spriteManager && (useCharacterSprites || !isCharacter)) {
                    if (!this._spriteRenderer && typeof EntitySpriteRenderer !== 'undefined') this._spriteRenderer = new EntitySpriteRenderer();
                    if (this._spriteRenderer) this._spriteRenderer.render(context, entity, screenX, screenY);
                } else if (renderable.type === 'enemy' && typeof EnemyEntityRenderer !== 'undefined') {
                    EnemyEntityRenderer.render(context, entity, screenX, screenY);
                }
            } catch (err) {
                console.warn('Render entity failed (skipping):', entity.id || renderable.type, err);
            }
        }

        if (playerDraw && typeof PlayerEntityRenderer !== 'undefined') {
            const { entity, screenX, screenY } = playerDraw;
            try {
                PlayerEntityRenderer.render(context, entity, screenX, screenY);
            } catch (err) {
                console.warn('Render entity failed (skipping):', entity.id || 'player', err);
            }
        }
    }
}

if (typeof window !== 'undefined') {
    window.EntityLayerRenderer = EntityLayerRenderer;
}
