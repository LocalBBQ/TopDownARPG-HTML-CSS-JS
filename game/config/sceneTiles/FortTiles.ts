/**
 * The Fort biome scene tiles (level 4).
 * Military outpost: walls, towers, barracks, courtyards, gatehouse.
 * Attached as SceneTiles.fort.
 */
export const SceneTilesFort: Record<string, { width: number; height: number; obstacles?: unknown[]; gatherables?: unknown[]; [key: string]: unknown }> = {
  /** Courtyard: open, no perimeter; barrels, braziers, interior crumbling walls. */
  clearing: {
    width: 1200,
    height: 1200,
    obstacles: [
      { type: 'brazier', x: 360, y: 360, width: 42, height: 42 },
      { type: 'brazier', x: 420, y: 420, width: 40, height: 40 },
      { type: 'barrel', x: 200, y: 380, width: 52, height: 52 },
      { type: 'barrel', x: 560, y: 400, width: 50, height: 50 },
      { type: 'rubble', x: 320, y: 520, width: 45, height: 45 },
      { type: 'stoneDebris', x: 480, y: 280, width: 38, height: 38 },
      { type: 'crumblingWall', x: 260, y: 620, width: 80, height: 24 },
      { type: 'crumblingWall', x: 460, y: 100, width: 24, height: 70 },
    ],
    gatherables: [
      { type: 'ore', x: 320, y: 520, width: 40, height: 40 },
      { type: 'chest', x: 420, y: 420, width: 36, height: 36 },
    ],
  },

  /** Crossroads: open, central brazier, barrels. */
  crossroads: {
    width: 1200,
    height: 1200,
    obstacles: [
      { type: 'brazier', x: 370, y: 365, width: 48, height: 48 },
      { type: 'barrel', x: 280, y: 340, width: 50, height: 50 },
      { type: 'barrel', x: 480, y: 440, width: 52, height: 52 },
      { type: 'stoneDebris', x: 380, y: 380, width: 40, height: 40 },
    ],
  },

  /** Barracks yard: crumbled perimeter (easier access), columns, braziers, barrels. */
  barracks: {
    width: 1200,
    height: 1200,
    perimeterWall: { type: 'crumblingWall', spacing: 24, size: 24, gapSegments: 6 },
    obstacles: [
      { type: 'column', x: 280, y: 320, width: 48, height: 48 },
      { type: 'column', x: 468, y: 318, width: 50, height: 50 },
      { type: 'brazier', x: 340, y: 360, width: 44, height: 44 },
      { type: 'brazier', x: 420, y: 358, width: 42, height: 42 },
      { type: 'barrel', x: 240, y: 420, width: 54, height: 54 },
      { type: 'barrel', x: 500, y: 400, width: 52, height: 52 },
      { type: 'rubble', x: 360, y: 480, width: 46, height: 46 },
      { type: 'crumblingWall', x: 200, y: 520, width: 200, height: 24 },
    ],
    gatherables: [
      { type: 'chest', x: 370, y: 420, width: 36, height: 36 },
    ],
  },

  /** Gatehouse: solid perimeter walls with doorways, thick interior walls, columns, braziers. */
  gatehouse: {
    width: 1200,
    height: 1200,
    perimeterWall: { spacing: 20, size: 20, gapSegments: 4 },
    obstacles: [
      { type: 'crumblingWall', x: 180, y: 340, width: 160, height: 24 },
      { type: 'crumblingWall', x: 456, y: 340, width: 160, height: 24 },
      { type: 'column', x: 340, y: 300, width: 52, height: 52 },
      { type: 'column', x: 408, y: 298, width: 54, height: 54 },
      { type: 'brazier', x: 300, y: 360, width: 46, height: 46 },
      { type: 'brazier', x: 454, y: 358, width: 44, height: 44 },
      { type: 'rubble', x: 320, y: 440, width: 48, height: 48 },
      { type: 'rubble', x: 432, y: 440, width: 46, height: 46 },
      { type: 'stoneDebris', x: 374, y: 400, width: 42, height: 42 },
    ],
  },

  /** Tower base: solid perimeter walls with doorways, central column, braziers. */
  tower: {
    width: 1200,
    height: 1200,
    perimeterWall: { spacing: 20, size: 20, gapSegments: 4 },
    obstacles: [
      { type: 'column', x: 362, y: 342, width: 56, height: 56 },
      { type: 'brazier', x: 280, y: 360, width: 44, height: 44 },
      { type: 'brazier', x: 476, y: 358, width: 42, height: 42 },
      { type: 'brazier', x: 368, y: 260, width: 42, height: 42 },
      { type: 'brazier', x: 368, y: 498, width: 44, height: 44 },
      { type: 'rubble', x: 320, y: 420, width: 45, height: 45 },
      { type: 'stoneDebris', x: 440, y: 360, width: 38, height: 38 },
    ],
    gatherables: [
      { type: 'ore', x: 320, y: 420, width: 40, height: 40 },
    ],
  },

  /** Armory: crumbled perimeter (easier access), interior walls, barrels, braziers. */
  armory: {
    width: 1200,
    height: 1200,
    perimeterWall: { type: 'crumblingWall', spacing: 24, size: 24, gapSegments: 6 },
    obstacles: [
      { type: 'crumblingWall', x: 120, y: 340, width: 100, height: 24 },
      { type: 'crumblingWall', x: 580, y: 420, width: 24, height: 90 },
      { type: 'barrel', x: 220, y: 380, width: 56, height: 56 },
      { type: 'barrel', x: 284, y: 400, width: 52, height: 52 },
      { type: 'barrel', x: 496, y: 360, width: 54, height: 54 },
      { type: 'barrel', x: 520, y: 420, width: 50, height: 50 },
      { type: 'brazier', x: 370, y: 365, width: 42, height: 42 },
      { type: 'rubble', x: 270, y: 460, width: 48, height: 48 },
      { type: 'rubble', x: 465, y: 320, width: 46, height: 46 },
    ],
    gatherables: [
      { type: 'chest', x: 370, y: 420, width: 36, height: 36 },
      { type: 'chest', x: 420, y: 380, width: 36, height: 36 },
    ],
  },

  /** Ruined section: crumbled perimeter (easier access), interior crumbling walls, rubble, brazier. */
  ruinFragment: {
    width: 1200,
    height: 1200,
    perimeterWall: { type: 'crumblingWall', spacing: 24, size: 24, gapSegments: 6 },
    obstacles: [
      { type: 'crumblingWall', x: 200, y: 240, width: 140, height: 24 },
      { type: 'crumblingWall', x: 456, y: 540, width: 140, height: 24 },
      { type: 'rubble', x: 320, y: 360, width: 50, height: 50 },
      { type: 'rubble', x: 430, y: 420, width: 48, height: 48 },
      { type: 'stoneDebris', x: 260, y: 400, width: 42, height: 42 },
      { type: 'stoneDebris', x: 500, y: 320, width: 40, height: 40 },
      { type: 'brazier', x: 374, y: 368, width: 44, height: 44 },
    ],
  },

  /** Training yard: crumbled perimeter (easier access), barrels, braziers. */
  trainingYard: {
    width: 1200,
    height: 1200,
    perimeterWall: { type: 'crumblingWall', spacing: 24, size: 24, gapSegments: 6 },
    obstacles: [
      { type: 'brazier', x: 280, y: 280, width: 46, height: 46 },
      { type: 'brazier', x: 470, y: 275, width: 44, height: 44 },
      { type: 'brazier', x: 275, y: 460, width: 48, height: 48 },
      { type: 'brazier', x: 472, y: 458, width: 46, height: 46 },
      { type: 'brazier', x: 370, y: 365, width: 42, height: 42 },
      { type: 'barrel', x: 320, y: 420, width: 52, height: 52 },
      { type: 'barrel', x: 430, y: 320, width: 50, height: 50 },
      { type: 'crumblingWall', x: 240, y: 520, width: 320, height: 24 },
      { type: 'rubble', x: 320, y: 380, width: 45, height: 45 },
      { type: 'rubble', x: 430, y: 400, width: 42, height: 42 },
    ],
    gatherables: [
      { type: 'ore', x: 320, y: 380, width: 40, height: 40 },
    ],
  },

  /** Siege camp: crumbled perimeter (easier access), barrels, rubble, braziers. */
  siegeCamp: {
    width: 1200,
    height: 1200,
    perimeterWall: { type: 'crumblingWall', spacing: 24, size: 24, gapSegments: 6 },
    obstacles: [
      { type: 'brazier', x: 340, y: 340, width: 48, height: 48 },
      { type: 'brazier', x: 420, y: 420, width: 46, height: 46 },
      { type: 'barrel', x: 240, y: 360, width: 56, height: 56 },
      { type: 'barrel', x: 500, y: 380, width: 54, height: 54 },
      { type: 'barrel', x: 360, y: 480, width: 52, height: 52 },
      { type: 'rubble', x: 280, y: 440, width: 50, height: 50 },
      { type: 'rubble', x: 460, y: 300, width: 48, height: 48 },
      { type: 'crumblingWall', x: 200, y: 240, width: 160, height: 24 },
      { type: 'crumblingWall', x: 440, y: 540, width: 160, height: 24 },
      { type: 'stoneDebris', x: 370, y: 370, width: 40, height: 40 },
    ],
    spawn: { type: 'pack', count: 1 },
    gatherables: [
      { type: 'chest', x: 380, y: 380, width: 36, height: 36 },
    ],
  },
};
