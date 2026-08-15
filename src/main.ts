import './style.css'
import { nearestOnTrack, worldPosAt } from './game/track'
import { buildRaceTrack } from './game/trackData'
import { createKart, stepKart, KART_CONFIG, type KartState, type KartControls } from './game/kart'
import { createRace, raceTick, updateRace } from './game/race'
import { createDrift, stepDrift, isBoosting, DRIFT_CONFIG } from './game/drift'
import { elevationAt, gradeAt } from './game/elevation'
import { Input } from './input'
import { AudioEngine } from './audio'
import { createScene, resize, updateChaseCamera, type SceneRig } from './render/scene'
import { Particles } from './render/particles'
import { TireMarks } from './render/tireMarks'
import { createClouds } from './render/clouds'
import { createGates } from './render/gates'
import { Minimap } from './render/minimap'

const SIM_DT = 1 / 120
const MAX_FRAME_DT = 0.1
const TOTAL_LAPS = 3
const CHECKPOINT_COUNT = 8
const OFF_TRACK_GRIP = 0.35
const RESCUE_DISTANCE = 60
const DRIFT_TURN_MUL = 1.45
const DRIFT_SLIDE = 6
const BOOST_ACCEL_BONUS = 30
const BOOST_MAX_SPEED_MUL = 1.32

const track = buildRaceTrack()

function spawnKart(): KartState {
  const pos = worldPosAt(track, 0, -3)
  const a = track.points[0]
  const b = track.points[1]
  const heading = Math.atan2(b.x - a.x, b.z - a.z)
  return createKart(pos, heading)
}

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!
const rig: SceneRig = createScene(track, canvas)
const input = new Input()
input.attach()
const audio = new AudioEngine()
const particles = new Particles(rig.scene)
const tireMarks = new TireMarks(rig.scene)
const clouds = createClouds()
rig.scene.add(clouds.group)
const gates = createGates(track, CHECKPOINT_COUNT)
rig.scene.add(gates.group)
const minimap = new Minimap(
  document.querySelector<HTMLCanvasElement>('#minimap')!,
  track,
)

window.addEventListener(
  'keydown',
  (e) => {
    audio.init()
    if (e.code === 'KeyM') {
      const muted = audio.toggleMusicMute()
      hud.help.textContent = muted
        ? 'Music muted — M to unmute · R to restart'
        : HELP_TEXT
    }
  },
  { once: false },
)

const HELP_TEXT =
  'W/↑ accelerate · S/↓/Space brake · A/D or ←/→ steer · Shift (while turning) drift → boost · R restart · M music'

let kart = spawnKart()
let race = createRace(TOTAL_LAPS, CHECKPOINT_COUNT)
const drift = createDrift()
let accumulator = 0
let lastTime = performance.now()
let fps = 60
let raceStartedInput = false
let lastControls: KartControls = { throttle: 0, brake: 0, steer: 0 }
let cameraShake = 0
let markTimer = 0

setTimeout(() => hud.help.classList.add('faded'), 12000)

resize(rig)
window.addEventListener('resize', () => resize(rig))

const hud = {
  speed: document.querySelector<HTMLElement>('#hud-speed')!,
  lap: document.querySelector<HTMLElement>('#hud-lap')!,
  time: document.querySelector<HTMLElement>('#hud-time')!,
  best: document.querySelector<HTMLElement>('#hud-best')!,
  last: document.querySelector<HTMLElement>('#hud-last')!,
  fps: document.querySelector<HTMLElement>('#hud-fps')!,
  surface: document.querySelector<HTMLElement>('#hud-surface')!,
  overlay: document.querySelector<HTMLElement>('#overlay')!,
  overlayTitle: document.querySelector<HTMLElement>('#overlay-title')!,
  overlayDetail: document.querySelector<HTMLElement>('#overlay-detail')!,
  help: document.querySelector<HTMLElement>('#help')!,
  boostWrap: document.querySelector<HTMLElement>('#boost-wrap')!,
  boostFill: document.querySelector<HTMLElement>('#boost-fill')!,
}

function restart(): void {
  kart = spawnKart()
  race = createRace(TOTAL_LAPS, CHECKPOINT_COUNT)
  drift.active = false
  drift.charge = 0
  drift.boostTime = 0
  raceStartedInput = false
  input.wantsRestart = false
  hud.overlay.classList.remove('visible')
}

function formatTime(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  const ms = Math.floor((t % 1) * 1000)
  return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

function showOverlay(title: string, detail: string): void {
  hud.overlayTitle.textContent = title
  hud.overlayDetail.textContent = detail
  hud.overlay.classList.add('visible')
}

function simStep(controls: KartControls): void {
  lastControls = controls
  const q = nearestOnTrack(track, kart.pos)
  const grip = q.isOnTrack ? 1 : OFF_TRACK_GRIP

  const driftResult = stepDrift(
    drift,
    { holding: input.driftHeld(), steer: controls.steer, speed: kart.speed },
    SIM_DT,
  )
  if (driftResult.event === 'drift-start') audio.play('skid')
  if (driftResult.event === 'boost') cameraShake = 0.35

  const opts = {
    turnMul: drift.active ? DRIFT_TURN_MUL : 1,
    slide: drift.active ? -drift.facing * DRIFT_SLIDE : 0,
    accelMul: isBoosting(drift)
      ? 1 + BOOST_ACCEL_BONUS / KART_CONFIG.engineAccel
      : 1,
    maxSpeedMul: isBoosting(drift) ? BOOST_MAX_SPEED_MUL : 1,
    slope: gradeAt(q.progress) / track.totalLength,
  }
  stepKart(kart, controls, SIM_DT, grip, opts)

  if (drift.active && q.isOnTrack && kart.speed > 8) {
    markTimer += SIM_DT
    if (markTimer > 0.035) {
      markTimer = 0
      const y = elevationAt(q.progress) + 0.08
      tireMarks.addMark(kart.pos.x, y, kart.pos.z, kart.heading, -0.85, 0.75)
      tireMarks.addMark(kart.pos.x, y, kart.pos.z, kart.heading, 0.85, 0.75)
    }
  }

  if (!raceStartedInput && controls.throttle > 0) {
    raceStartedInput = true
    race.started = true
    audio.play('go')
  }
  raceTick(race, SIM_DT)

  if (!race.finished) {
    const sector = Math.floor(q.progress * CHECKPOINT_COUNT) % CHECKPOINT_COUNT
    const event = updateRace(race, sector)
    if (event === 'checkpoint' || event === 'lap') audio.play(event)
    if (event === 'finish') {
      audio.play('finish')
      const total = race.lapTimes.reduce((a, b) => a + b, 0)
      const best = Math.min(...race.lapTimes)
      showOverlay(
        'FINISH!',
        `Total ${formatTime(total)}  ·  Best lap ${formatTime(best)}  ·  Press R to race again`,
      )
    }
  }

  if (Math.abs(q.lateral) > RESCUE_DISTANCE) {
    kart.pos = { x: q.center.x, z: q.center.z }
    kart.speed = 0
  }
}

function render(dt: number, controls: KartControls): void {
  const q = nearestOnTrack(track, kart.pos)
  const groundY = elevationAt(q.progress)
  const slope = gradeAt(q.progress) / track.totalLength

  rig.kartRig.group.position.set(kart.pos.x, groundY, kart.pos.z)
  rig.kartRig.group.rotation.y = kart.heading
  rig.kartRig.group.rotation.x = -Math.atan(slope)
  const spin = (kart.speed * dt) / rig.kartRig.wheelRadius
  for (const w of rig.kartRig.wheels) w.rotation.x += spin
  for (const w of rig.kartRig.frontWheels) w.rotation.y = controls.steer * -0.45
  updateChaseCamera(rig, kart.pos, kart.heading, kart.speed, dt, groundY)

  if (cameraShake > 0.005) {
    cameraShake *= Math.exp(-4 * dt)
    rig.camera.position.x += (Math.random() - 0.5) * cameraShake
    rig.camera.position.y += (Math.random() - 0.5) * cameraShake * 0.6
    rig.camera.lookAt(rig.cameraTarget)
  }

  emitEffects(groundY)
  particles.update(dt)
  tireMarks.update(dt)
  clouds.update(dt)
  gates.highlight(race.finished ? 0 : race.nextCheckpoint, performance.now() / 1000)

  const nextGatePos =
    gates.gatePositions[race.finished ? 0 : race.nextCheckpoint % CHECKPOINT_COUNT]
  minimap.draw(kart.pos, kart.heading, nextGatePos)

  rig.renderer.render(rig.scene, rig.camera)
}

function emitEffects(groundY: number): void {
  const fx = Math.sin(kart.heading)
  const fz = Math.cos(kart.heading)
  const rx = -Math.cos(kart.heading)
  const rz = Math.sin(kart.heading)
  const rearX = kart.pos.x - fx * 1.2
  const rearZ = kart.pos.z - fz * 1.2

  if (drift.active) {
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -0.85 : 0.85
      particles.spawn(
        rearX + rx * side, groundY + 0.15, rearZ + rz * side,
        (Math.random() - 0.5) * 3 - fx * 4,
        1.5 + Math.random() * 2,
        (Math.random() - 0.5) * 3 - fz * 4,
        drift.charge >= DRIFT_CONFIG.tier2 ? 0xffd23e : 0xff8a3d,
        0.45, 1.1, groundY + 0.05,
      )
    }
  }

  if (isBoosting(drift)) {
    for (let i = 0; i < 3; i++) {
      particles.spawn(
        rearX, groundY + 0.35 + Math.random() * 0.2, rearZ,
        -fx * (9 + Math.random() * 5) + (Math.random() - 0.5) * 2,
        0.5 + Math.random(),
        -fz * (9 + Math.random() * 5) + (Math.random() - 0.5) * 2,
        Math.random() < 0.5 ? 0x4fc3f7 : 0x9be7ff,
        0.3, 1.3, groundY + 0.05,
      )
    }
  }

  const onTrack = !hud.surface.textContent
  if (!onTrack && Math.abs(kart.speed) > 6) {
    for (let i = 0; i < 2; i++) {
      particles.spawn(
        kart.pos.x + (Math.random() - 0.5) * 1.5, groundY - 0.2,
        kart.pos.z + (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 4, 2 + Math.random() * 3,
        (Math.random() - 0.5) * 4,
        0x5a9c48, 0.5, 0.9, groundY - 0.3,
      )
    }
  }
}

function updateHud(): void {
  hud.speed.textContent = `${Math.round(Math.max(0, kart.speed) * 3.6)} km/h`
  hud.lap.textContent = `LAP ${Math.min(race.lap, race.totalLaps)}/${race.totalLaps}`
  hud.time.textContent = formatTime(race.currentLapTime)
  const best = race.lapTimes.length > 0 ? Math.min(...race.lapTimes) : null
  hud.best.textContent = best === null ? '—' : formatTime(best)
  const last = race.lapTimes.length > 0 ? race.lapTimes[race.lapTimes.length - 1] : null
  hud.last.textContent = last === null ? '—' : formatTime(last)
  hud.fps.textContent = `${Math.round(fps)} FPS`
  const q = nearestOnTrack(track, kart.pos)
  hud.surface.textContent = q.isOnTrack ? '' : 'OFF TRACK'

  if (drift.active) {
    hud.boostWrap.classList.add('visible')
    const frac = Math.min(1, drift.charge / DRIFT_CONFIG.tier2)
    hud.boostFill.style.width = `${Math.round(frac * 100)}%`
    hud.boostFill.classList.toggle('tier2', drift.charge >= DRIFT_CONFIG.tier2)
  } else if (isBoosting(drift)) {
    hud.boostWrap.classList.add('visible')
    hud.boostFill.style.width = '100%'
    hud.boostFill.classList.add('tier2')
  } else {
    hud.boostWrap.classList.remove('visible')
  }
}

function frame(now: number): void {
  requestAnimationFrame(frame)
  let dt = (now - lastTime) / 1000
  lastTime = now
  if (dt > MAX_FRAME_DT) dt = MAX_FRAME_DT

  if (input.wantsRestart) restart()

  accumulator += dt
  let steps = 0
  while (accumulator >= SIM_DT && steps < 8) {
    simStep(input.readControls(SIM_DT))
    accumulator -= SIM_DT
    steps++
  }
  if (steps === 8) accumulator = 0

  render(dt, lastControls)

  const speedNorm = Math.min(1, Math.abs(kart.speed) / KART_CONFIG.maxSpeed)
  const onTrack = !hud.surface.textContent
  const steerIntensity =
    Math.abs(lastControls.steer) * Math.min(1, Math.abs(kart.speed) / 12)
  audio.update(
    speedNorm,
    lastControls.throttle,
    Math.max(steerIntensity, onTrack ? 0 : 0.7, drift.active ? 0.8 : 0),
    isBoosting(drift),
  )

  updateHud()

  fps += (1 / Math.max(dt, 1e-4) - fps) * 0.08
}

requestAnimationFrame(frame)
