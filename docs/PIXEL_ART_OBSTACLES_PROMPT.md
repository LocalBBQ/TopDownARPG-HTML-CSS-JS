# Pixel Art Obstacles – Prompt Guide

This doc is based on your **procedurally generated obstacles**. Use it to brief an artist or AI so replacement sprites fit the game. All dimensions are **world pixels**; the game draws each sprite scaled to the obstacle’s `width × height`.

---

## How sprites are used

- **Single-image obstacles** (rock, bush, well, etc.): one image per type, drawn at `obstacle.width × obstacle.height`. Use a **square or near-square** canvas in the size ranges below so scaling looks good.
- **Trees**: use a **horizontal strip of 3 frames**. Image width = 3 × (frame width). The game picks a random frame (0–2) per tree. Each frame should be one tree variant (e.g. oak, pine, birch).
- **Fence**: repeated along borders; one segment is drawn at `width × height` (often 28–36 px). Design a **single repeatable segment** that tiles horizontally/vertically.

---

## Object list (by category)

### Forest / Village (Level 1)

| Object       | In-game size (W×H) | Sprite format | Visual (procedural fallback) |
|-------------|--------------------|---------------|-------------------------------|
| **tree**    | 30–150 (common 90–130) | **3-frame horizontal strip**. Total image: 3×(frame width) × height. Single frame: e.g. 128×128 px → strip 384×128 px | Brown trunk, round green canopy |
| **rock**    | 30–80 (common 50–70) | Single image, square | Gray rounded boulder |
| **bush**    | 25–56 (common 48–56) | Single image, square | Dense green foliage blob |
| **well**    | 40–90 (common 88–90) | Single image, square | Stone rim, dark hole, optional roof |
| **shed**    | 100–240 (common 180–240) | Single image, square | Wooden shed, roof, door |
| **house**   | 160–240             | Single image, square | Building with walls/door (or use wall segments) |
| **wall**    | 20×20 (segments)    | Single image, 20×20 | Stone/brick segment for walls |
| **door**    | 60–80               | Single image         | Doorway or door frame |
| **firepit** | 30–76 (common 70–76) | Single image, square | Ring of rocks, ash/embers center |
| **fence**   | 15–36 (common 28–36) | Single image, square | One fence segment (post + rails) that tiles |
| **barrel**  | 25–64 (common 48–60) | Single image, square | Wooden barrel, horizontal |
| **pillar**  | 35–90 (scene 90)    | Single image, square | Stone column, vertical |
| **brokenPillar** | 40–70           | Single image         | Fallen or broken column |
| **rubble**  | 25–55 (common 48–55) | Single image, square | Pile of stones/bricks |
| **crumblingWall** | 20–35            | Single image         | Short ruined wall segment |
| **arch**    | 60–90               | Single image, square | Stone arch (e.g. ruins) |
| **statueBase** | 45–100 (scene 100) | Single image, square | Pedestal or statue base |
| **column**  | 30–60 (scene 58–60) | Single image, square | Thin column |
| **stoneDebris** | 18–45 (common 40–45) | Single image, square | Small rocks/debris |

### Cursed Wilds (Level 2)

| Object        | In-game size (W×H) | Sprite format | Visual (procedural fallback) |
|---------------|--------------------|---------------|-------------------------------|
| **mushroom**  | 13–85              | Single image, square | Either: round cap + stem, OR dead tree (leafless branches, 3 variants) |
| **grave**     | 28–42              | Single image, square | Gray base, cross/headstone shape |
| **swampPool** | 50–90              | *(Optional)*  | Dark teal ellipse; usually keep procedural |
| **darkRock**  | 28–48              | Single image, square | Dark gray/black rock |

### Demon Approach (Level 3)

| Object         | In-game size (W×H) | Sprite format | Visual (procedural fallback) |
|----------------|--------------------|---------------|-------------------------------|
| **lavaRock**   | 32–55              | Single image, square | Dark red/brown rock, orange crack glow |
| **demonPillar**| 38–58              | Single image, square | Dark pillar, red glow on top |
| **brazier**    | 35–50              | Single image, square | Metal bowl on stand, fire in bowl |

---

## Recommended pixel dimensions for assets

Use these as **sprite canvas sizes** (game will scale to actual obstacle size). Prefer powers of two or multiples of 8 for clean scaling.

| Asset            | Suggested canvas      | Notes |
|------------------|------------------------|-------|
| Trees.png        | 384×128 (3×128) or 3×96 → 288×96 | 3 frames, one per column |
| rock             | 64×64 or 48×48        | |
| bush             | 56×56 or 48×48        | |
| well             | 96×96 or 88×88       | |
| shed             | 256×256 or 240×240   | |
| firepit          | 76×76 or 64×64       | |
| fence            | 36×36 or 32×32       | One segment, tileable |
| barrel           | 64×64 or 56×56       | |
| pillar           | 96×96 or 64×64      | |
| rubble           | 56×56 or 48×48      | |
| statueBase       | 100×100 or 96×96    | |
| column           | 64×64 or 56×56      | |
| stoneDebris      | 48×48 or 40×40      | |
| mushroom         | 64×64 or 48×48      | Cap+stem or dead tree |
| grave            | 48×48 or 42×42      | |
| darkRock         | 48×48 or 40×40      | |
| lavaRock         | 56×56 or 48×48      | |
| demonPillar      | 64×64 or 56×56      | |
| brazier          | 56×56 or 48×48      | |
| wall             | 20×20                | Segment |
| door             | 80×80 or 64×64      | |
| house            | 256×256 (optional)   | |
| arch             | 96×96 or 80×80      | |
| brokenPillar     | 72×72 or 64×64      | |
| crumblingWall    | 32×32 or 28×28      | |

---

## Copy-paste prompt for “one style” pixel art

You can give this to an artist or image model (e.g. for a sprite sheet or single asset):

```
Top-down or slight isometric pixel art for a dark fantasy action game (Diablo-like). 
Consistent palette: muted greens and browns for forest, dark grays for ruins, 
dark red/orange for demon level. No outlines or thin black outlines only. 
Assets are drawn at [SIZE]×[SIZE] pixels and will be scaled in-engine.

Object: [OBJECT NAME]
Description: [e.g. "Stone well with circular rim, dark hole in center, small wooden roof"]
Style: Pixel art, 16-bit era aesthetic, readable at small scale, consistent with other environment props.
```

For **Trees.png** specifically:

```
Pixel art sprite strip for a dark fantasy game. One horizontal strip with 3 tree variants side by side.
Each tree: brown trunk, round or slightly irregular green canopy (top-down or slight angle).
Strip dimensions: 3×(frame width) × (frame height), e.g. 384×128 px for 128×128 per frame.
Style: 16-bit era, muted greens (#2d5016 range) and browns (#4a2c1a), no thick black outlines.
```

---

## Where paths are set in code

- Default sprite paths: `js/managers/ObstacleManager.js` → `ObjectFactory` `configs` (e.g. `defaultSpritePath: 'assets/rock.png'`).
- Trees: `assets/sprites/environment/Trees.png` (3-frame strip).
- Place new sprites in `assets/` or `assets/sprites/environment/` and set `defaultSpritePath` for that type (or leave `null` to keep procedural drawing).

Once a sprite is set and loaded, the renderer uses it instead of the procedural shape, so matching the size ranges above will make replacements fit the game.
