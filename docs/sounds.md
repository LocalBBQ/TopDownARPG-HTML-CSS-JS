# Sound effects (SFX)

SFX are driven by the **EventBus**. `SoundManager` subscribes to game events and plays the corresponding sounds when **Settings → SFX** is enabled.

## Where to put files

Put OGG (and optionally MP3) files in **`public/sounds/`**. Vite serves `public/` at the site root, so paths are `/sounds/<id>.ogg`.

## Sound IDs and when they play

| Sound ID           | File name           | Event / trigger              |
|--------------------|---------------------|------------------------------|
| `hit`              | `hit.ogg`           | Player hits enemy (no kill)  |
| `kill`             | `kill.ogg`          | Player kills enemy           |
| `player_hurt`      | `player_hurt.ogg`   | Player takes damage          |
| `block`            | `block.ogg`         | Player blocks with shield    |
| `dash`             | `dash.ogg`          | Player dash attack           |
| `inventory_open`   | `inventory_open.ogg`| Tab to open/close inventory  |

Add the files you need; missing files will 404 in the console but the game will still run.

## Adding new sounds

1. Add the file to `public/sounds/<id>.ogg` (and optionally `<id>.mp3` for fallback).
2. In `game/audio/SoundManager.ts`:
   - Add an entry to `SOUND_IDS` if you want a named constant.
   - In `subscribe()`, listen to an existing event (or a new one from `EventTypes`) and call `this.play('your_id')`.
3. Optionally preload in `Game.ts` where `soundManager.preload(...)` is called.

## Playing a sound from game code

Prefer emitting an event so `SoundManager` can react. If you need to play ad hoc:

- Get the `EventBus` from `systems.eventBus` and emit a suitable event that `SoundManager` already handles, or
- Create a new event type in `EventTypes.ts`, emit it where the action happens, and in `SoundManager.subscribe()` call `this.eventBus.on(...)` and `this.play('your_id')`.

You can also keep a reference to `SoundManager` (e.g. on `Game`) and call `soundManager.play('your_id')` for one-off UI sounds.
