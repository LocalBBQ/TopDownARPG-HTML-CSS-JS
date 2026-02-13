# EntityLayerRenderer breakout plan

## Current state
- **EntityLayerRenderer.js** (~75 lines): orchestrator only; delegates to EntitySpriteRenderer, EnemyEntityRenderer, PlayerEntityRenderer.
- **EntityEffectsRenderer.js**: shadow, healing vial, modifier tag, stun symbol, health/stamina/stun bars.
- **EnemyEntityRenderer.js**: enemy procedural bodies, telegraphs, weapon overlay, bars.
- **PlayerEntityRenderer.js**: player procedural body, weapons, vial, bars, reload/charge meters.
- **EntitySpriteRenderer.js**: sprite-sheet path; effects + enemy/player weapon overlays when applicable.

## Target structure

| Module | Responsibility |
|--------|----------------|
| **EntityEffectsRenderer** | Shadow, healing vial, modifier tag, stun symbol, health/stamina/stun bars (shared). |
| **EntitySpriteRenderer** | Sprite-sheet frame selection and draw; then effects + enemy weapon overlay when applicable. |
| **EnemyEntityRenderer** | Enemy telegraphs, indicators, procedural bodies (goblin, chieftain, demon, skeleton), enemy weapon, bars. |
| **PlayerEntityRenderer** | Player path debug, procedural body (helmet, pauldrons), weapons (via PlayerCombatRenderer), vial, bars, crossbow reload, charge meter. |
| **EntityLayerRenderer** | Orchestrator only: loop entities, cull, delegate to sprite/enemy/player renderers, draw player last. |

## Script load order (index.html)
1. RenderContext.js
2. EntityEffectsRenderer.js
3. EnemyEntityRenderer.js (provides drawWeapon for sprite path)
4. PlayerEntityRenderer.js
5. EntitySpriteRenderer.js
6. EntityLayerRenderer.js

## Status
- [x] **Phase 1:** EntityEffectsRenderer.js created; EntityLayerRenderer delegates drawHealingVial, drawModifierTag, drawStunSymbol to it. index.html loads EntityEffectsRenderer before EntityLayerRenderer.
- [x] **Phase 2:** EnemyEntityRenderer.js, PlayerEntityRenderer.js, EntitySpriteRenderer.js created; EntityLayerRenderer slimming complete. index.html script order: EntityEffectsRenderer → EnemyEntityRenderer → PlayerEntityRenderer → EntitySpriteRenderer → WorldLayerRenderer → EntityLayerRenderer.
