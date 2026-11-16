# @shared/match3d

Shared three.js renderer for the pitch, players, ball and broadcast camera. It is consumed
locally by both `football-game` and `touchline` so a visual improvement lands in both.

## Wiring

Both apps depend on a tagged release of this repository:

```json
"@shared/match3d": "github:irrevaldy/match3d#v0.1.0"
```

To release a change: commit, tag a new version (`git tag v0.1.1 && git push --tags`), then
bump the tag in each consumer's `package.json` and run `npm install`.

For live local editing, link the checkout into a consumer with `npm link`: run it once here,
then `npm link @shared/match3d` in the app. Run `npm install` in the app to go back to the
tagged version.

`three` is a peer dependency. Both Vite configs set `resolve.dedupe: ['three']` so the
symlinked package resolves to the app's single copy instead of looking for its own.

## API

```js
import {
  createPitchScene,
  createPlayerMesh,
  animatePlayerMesh,
  createBallMesh,
  createControlledRing,
  CameraRig,
  PITCH_LENGTH,
  PITCH_HALF_LENGTH,
} from '@shared/match3d'
```

- `createPitchScene({ adBoardText })` → `{ scene, dispose }`
- `createPlayerMesh({ team, shirtColor, shortsColor, role, seed })` → player mesh handle
- `animatePlayerMesh(mesh, speed, dtSeconds, celebrate)` → run cycle / celebration
- `createBallMesh()` → ball mesh
- `createControlledRing()` → selection ring
- `new CameraRig(camera)` with `update(ballX, ballZ, spread, dtMs)` and `boost()`

## Rules for changes here

1. Keep this package framework-agnostic: no React, no game-specific imports.
2. Anything that is purely a visual primitive belongs here; game logic stays in the app.
3. Update `types/index.d.ts` whenever the public API changes.
4. Verify both consumers after a change (see each app's README).
