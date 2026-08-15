export interface DriftState {
  active: boolean
  charge: number
  boostTime: number
  boostTier: number
  facing: number
}

export interface DriftInput {
  holding: boolean
  steer: number
  speed: number
}

export interface DriftStep {
  event: 'none' | 'drift-start' | 'boost'
  tier: number
}

export const DRIFT_CONFIG = {
  minSpeed: 12,
  minSteer: 0.3,
  stallSpeed: 7,
  chargeRate: 1,
  tier1: 1.0,
  tier2: 2.2,
  boost1: 0.9,
  boost2: 1.6,
}

export function createDrift(): DriftState {
  return { active: false, charge: 0, boostTime: 0, boostTier: 0, facing: 1 }
}

export function isBoosting(d: DriftState): boolean {
  return d.boostTime > 0
}

export function stepDrift(
  d: DriftState,
  input: DriftInput,
  dt: number,
): DriftStep {
  if (d.boostTime > 0) d.boostTime = Math.max(0, d.boostTime - dt)

  const canStart =
    !d.active &&
    d.boostTime <= 0 &&
    input.holding &&
    Math.abs(input.steer) >= DRIFT_CONFIG.minSteer &&
    input.speed >= DRIFT_CONFIG.minSpeed

  if (canStart) {
    d.active = true
    d.facing = Math.sign(input.steer)
    d.charge = chargeGain(input.steer, dt)
    return { event: 'drift-start', tier: 0 }
  }

  if (d.active) {
    const stalled =
      !input.holding || input.speed < DRIFT_CONFIG.stallSpeed
    if (stalled) {
      let tier = 0
      if (d.charge >= DRIFT_CONFIG.tier2) {
        d.boostTime = DRIFT_CONFIG.boost2
        d.boostTier = 2
        tier = 2
      } else if (d.charge >= DRIFT_CONFIG.tier1) {
        d.boostTime = DRIFT_CONFIG.boost1
        d.boostTier = 1
        tier = 1
      }
      d.active = false
      d.charge = 0
      return tier > 0 ? { event: 'boost', tier } : { event: 'none', tier: 0 }
    }
    d.charge += chargeGain(input.steer, dt)
  }

  return { event: 'none', tier: 0 }
}

function chargeGain(steer: number, dt: number): number {
  return DRIFT_CONFIG.chargeRate * dt * (0.4 + 0.6 * Math.abs(steer))
}
