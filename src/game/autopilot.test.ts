import { describe, it, expect } from 'vitest'
import { buildRaceTrack } from './trackData'
import { nearestOnTrack, worldPosAt } from './track'
import { createKart, stepKart, KART_CONFIG } from './kart'
import { createRace, raceTick, updateRace } from './race'

const dt = 1 / 120
const track = buildRaceTrack()

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

function pathHeadingAt(progress: number): number {
  const a = worldPosAt(track, progress - 0.001, 0)
  const b = worldPosAt(track, progress + 0.001, 0)
  return Math.atan2(b.x - a.x, b.z - a.z)
}

function curvatureAhead(progress: number, meters: number): number {
  const dp = meters / track.totalLength
  return Math.abs(wrapAngle(pathHeadingAt(progress + dp) - pathHeadingAt(progress)))
}

interface DriveMetrics {
  laps: number
  simSeconds: number
  offTrackFraction: number
  avgSpeed: number
  steerAgitation: number
  maxOffTrackExcursion: number
}

// Deterministic racing-line autopilot: lookahead steering + curvature-based
// speed target. Doubles as a drivability test of the physics tune.
function runAutopilot(totalLaps: number): DriveMetrics {
  const start = worldPosAt(track, 0, -2)
  const kart = createKart(start, pathHeadingAt(0))
  const race = createRace(totalLaps, 8)

  let steps = 0
  let offSteps = 0
  let maxExcursion = 0
  let speedSum = 0
  let headingChangeSum = 0
  let prevHeading = kart.heading
  let finished = false
  const limit = 120 * 60 * 8 // hard stop: 8 minutes sim time

  while (!finished && steps < limit) {
    const q = nearestOnTrack(track, kart.pos)
    const lookMeters = 5 + Math.abs(kart.speed) * 0.55
    const look = worldPosAt(
      track,
      q.progress + lookMeters / track.totalLength,
      -2,
    )
    const desired = Math.atan2(look.x - kart.pos.x, look.z - kart.pos.z)
    const err = wrapAngle(desired - kart.heading)
    // positive steer decreases heading in kart.ts's convention
    const steer = Math.max(-1, Math.min(1, -2.4 * err))

    const curve = curvatureAhead(q.progress, 18 + Math.abs(kart.speed) * 1.4)
    const targetSpeed =
      KART_CONFIG.maxSpeed - curve * 30 - (q.isOnTrack ? 0 : 8)
    const throttle = kart.speed < targetSpeed ? 1 : 0
    const brake = kart.speed > targetSpeed + 2.5 ? 1 : 0

    const slope = 0
    stepKart(kart, { throttle, brake, steer }, dt, q.isOnTrack ? 1 : 0.35, {
      slope,
    })
    raceTick(race, dt)
    if (!race.finished) {
      const sector = Math.floor(q.progress * 8) % 8
      updateRace(race, sector)
    }
    if (race.finished) finished = true

    if (!q.isOnTrack) offSteps++
    maxExcursion = Math.max(maxExcursion, Math.abs(q.lateral) - track.halfWidth)
    speedSum += Math.max(0, kart.speed)
    headingChangeSum += Math.abs(wrapAngle(kart.heading - prevHeading))
    prevHeading = kart.heading
    steps++
  }

  const metrics: DriveMetrics = {
    laps: race.lapTimes.length,
    simSeconds: steps * dt,
    offTrackFraction: offSteps / steps,
    avgSpeed: speedSum / steps,
    steerAgitation: headingChangeSum / (steps * dt),
    maxOffTrackExcursion: maxExcursion,
  }
  return metrics
}

describe('autopilot drivability', () => {
  it('completes 3 laps without getting stuck', () => {
    const m = runAutopilot(3)
    expect(m.laps).toBe(3)
    expect(m.simSeconds).toBeLessThan(360)
  })

  it('keeps the racing line: on track > 97% of the time', () => {
    const m = runAutopilot(3)
    expect(m.offTrackFraction).toBeLessThan(0.03)
    expect(m.maxOffTrackExcursion).toBeLessThan(6)
  })

  it('maintains race pace', () => {
    const m = runAutopilot(3)
    expect(m.avgSpeed).toBeGreaterThan(22)
  })

  it('steering is not jittery (agitation bound)', () => {
    const m = runAutopilot(3)
    expect(m.steerAgitation).toBeLessThan(0.9)
  })

  it('never needs the rescue (stays near the track)', () => {
    const m = runAutopilot(1)
    expect(m.maxOffTrackExcursion).toBeLessThan(45)
  })
})
