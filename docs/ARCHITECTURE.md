# Architecture

## Goals

1. **Deterministic, testable core.** All gameplay rules live in pure
   TypeScript modules under `src/game/` with no DOM or Three.js imports.
   Rendering is a thin consumer.
2. **TDD everywhere it matters.** Physics, track math, race state, drift,
   elevation and even "is the game drivable" are covered by Vitest specs
   (`npm test`, 79 tests).
3. **60 FPS.** Fixed-timestep simulation decoupled from rendering,
   InstancedMesh for particles/trees, MeshLambert (no PBR), procedural
   canvas textures, pixel ratio capped at 1.5.

## Module map

```
src/game/            PURE (no DOM, no three)
  types.ts           Vec2
  spline.ts          closed Catmull-Rom sampling
  trackData.ts       the circuit: control points + width
  track.ts           buildTrack, nearestOnTrack (progress/lateral/on-track),
                     worldPosAt (progress/lateral -> world)
  kart.ts            arcade physics: throttle/brake/steer/grip + slope,
                     speed-dependent steering authority (turnFactorFor)
  drift.ts           drift state machine: activation, charge tiers, boost
  elevation.ts       analytic periodic hills + gradient (gradeAt)
  race.ts            checkpoint-ordered lap detection, lap times

  *.test.ts          unit specs for each module
  autopilot.test.ts  drivability harness: a lookahead-steering autopilot
                     races the real circuit and asserts lap completion,
                     on-track %, pace and steering-calm thresholds

src/render/          THREE layer (no game rules)
  scene.ts           renderer/scene/camera setup, displaced terrain,
                     exponential chase cam (FOV widens with speed)
  trackMesh.ts       road ribbon (seam-correct UVs), crisp distance-based
                     kerb stripes, start line, instanced trees — all follow
                     elevation
  kartMesh.ts        low-poly kart; YXZ wheel order so steer is outer
  gates.ts           checkpoint arches; next gate pulses
  minimap.ts         cached 2D track + kart arrow + next-gate dot
  particles.ts       instanced pool (drift sparks, boost flames, grass)
  tireMarks.ts       ring-buffer quads, fading alpha
  clouds.ts          drifting low-poly clouds
  textures.ts        procedural asphalt/grass canvas textures

src/audio.ts         WebAudio: synthesized engine hum/skid + generated
                     one-shots (fetch'd from /sfx), <audio> music loop
src/input.ts         key state -> clamped controls, steering ramp
src/main.ts          wiring: 120 Hz fixed-step sim accumulator, effects
                     emission, HUD updates, resize
```

## Key designs

### Fixed timestep

`main.ts` accumulates frame time and steps the simulation at exactly
1/120 s (capped at 8 steps/frame). Identical inputs produce identical
races; render interpolation comes free from the smooth chase camera.

### Track model

The circuit is a closed Catmull-Rom sampled into a polyline
(`spline.ts` + `track.ts`). `nearestOnTrack` gives progress ∈ [0,1),
signed lateral offset and on-track status; `worldPosAt` inverts it.
Race sectors are `floor(progress * checkpointCount)`; lap detection
(`race.ts`) requires passing sectors in order before the start line
counts — no shortcut exploits.

### Drift state machine

`drift.ts` is a pure FSM: activation needs speed + steer + Shift (not
while boosting); charge accrues scaled by steer intensity; release fires
tier-1/tier-2 boosts. `main.ts` maps state onto kart physics via
`StepOptions` (turn multiplier, lateral slide, accel/max-speed boosts).

### Elevation

`elevation.ts` sums two sines over lap progress; `gradeAt` is its
analytic derivative. The grade feeds kart physics as gravity-along-path,
and every renderer samples the same functions, so road/terrain/objects
never disagree. Ground truth for "gentle": max grade < 9%.

### Drivability testing

`autopilot.test.ts` races the track with a deterministic controller
(lookahead point + curvature-based target speed). It currently laps in
~31.6 s with 0% off-track — and pins steering agitation, so feel-tuning
(turn rate, high-speed authority, input ramp) can't silently regress.

### Generated assets

`scripts/gen-audio.mjs` calls ElevenLabs (sound-effects + music APIs)
with the token from `.env` (never committed, never bundled — assets land
in `public/sfx|music`). The game degrades gracefully if they're missing:
engine/skid are synthesized, one-shots simply skip.

## Verification

```bash
npm test          # 79 tests: unit + drivability
npx tsc --noEmit  # strict typecheck (the build also runs it)
npm run build     # production bundle
```
