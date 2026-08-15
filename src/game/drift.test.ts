import { describe, it, expect } from 'vitest'
import {
  createDrift,
  stepDrift,
  isBoosting,
  DRIFT_CONFIG,
  type DriftState,
  type DriftInput,
} from './drift'

const dt = 1 / 120

function driftInput(o: Partial<DriftInput> = {}): DriftInput {
  return { holding: true, steer: 1, speed: 20, ...o }
}

function chargeFor(
  state: DriftState,
  seconds: number,
  input: DriftInput = driftInput(),
): void {
  const steps = Math.round(seconds / dt)
  for (let i = 0; i < steps; i++) stepDrift(state, input, dt)
}

describe('createDrift', () => {
  it('starts inactive with no charge or boost', () => {
    const d = createDrift()
    expect(d.active).toBe(false)
    expect(d.charge).toBe(0)
    expect(d.boostTime).toBe(0)
    expect(isBoosting(d)).toBe(false)
  })
})

describe('drift activation', () => {
  it('does not start below min speed', () => {
    const d = createDrift()
    const r = stepDrift(d, driftInput({ speed: DRIFT_CONFIG.minSpeed - 1 }), dt)
    expect(d.active).toBe(false)
    expect(r.event).toBe('none')
  })

  it('does not start without steering', () => {
    const d = createDrift()
    stepDrift(d, driftInput({ steer: 0.1 }), dt)
    expect(d.active).toBe(false)
  })

  it('does not start while boost is active', () => {
    const d = createDrift()
    d.boostTime = 1
    stepDrift(d, driftInput(), dt)
    expect(d.active).toBe(false)
  })

  it('starts when holding drift with enough steer and speed', () => {
    const d = createDrift()
    const r = stepDrift(d, driftInput(), dt)
    expect(r.event).toBe('drift-start')
    expect(d.active).toBe(true)
    expect(d.facing).toBe(1)
    expect(d.charge).toBeGreaterThan(0)
  })

  it('records facing sign from steer direction', () => {
    const left = createDrift()
    stepDrift(left, driftInput({ steer: -1 }), dt)
    expect(left.facing).toBe(-1)
  })
})

describe('charge and release', () => {
  it('charge accumulates over time while drifting', () => {
    const d = createDrift()
    stepDrift(d, driftInput(), dt)
    const c1 = d.charge
    chargeFor(d, 0.5)
    expect(d.charge).toBeGreaterThan(c1 + 0.4)
  })

  it('full steer charges faster than partial steer', () => {
    const full = createDrift()
    const partial = createDrift()
    stepDrift(full, driftInput({ steer: 1 }), dt)
    stepDrift(partial, driftInput({ steer: 0.4 }), dt)
    chargeFor(full, 1, driftInput({ steer: 1 }))
    chargeFor(partial, 1, driftInput({ steer: 0.4 }))
    expect(full.charge).toBeGreaterThan(partial.charge * 1.5)
  })

  it('releasing with no charge gives no boost and ends drift', () => {
    const d = createDrift()
    stepDrift(d, driftInput(), dt)
    const r = stepDrift(d, driftInput({ holding: false }), dt)
    expect(r.event).toBe('none')
    expect(d.active).toBe(false)
    expect(d.charge).toBe(0)
    expect(d.boostTime).toBe(0)
  })

  it('releasing with tier1 charge fires a tier1 boost', () => {
    const d = createDrift()
    stepDrift(d, driftInput(), dt)
    chargeFor(d, 1.2)
    const r = stepDrift(d, driftInput({ holding: false }), dt)
    expect(r.event).toBe('boost')
    expect(r.tier).toBe(1)
    expect(d.boostTime).toBeCloseTo(DRIFT_CONFIG.boost1, 4)
    expect(d.active).toBe(false)
    expect(isBoosting(d)).toBe(true)
  })

  it('long drift releases a stronger tier2 boost', () => {
    const d = createDrift()
    stepDrift(d, driftInput(), dt)
    chargeFor(d, 3)
    const r = stepDrift(d, driftInput({ holding: false }), dt)
    expect(r.event).toBe('boost')
    expect(r.tier).toBe(2)
    expect(d.boostTime).toBeCloseTo(DRIFT_CONFIG.boost2, 4)
  })

  it('dropping below stall speed ends the drift without boost if uncharged', () => {
    const d = createDrift()
    stepDrift(d, driftInput(), dt)
    const r = stepDrift(d, driftInput({ speed: 1 }), dt)
    expect(d.active).toBe(false)
    expect(r.event).toBe('none')
  })
})

describe('boost decay', () => {
  it('boost time counts down to zero', () => {
    const d = createDrift()
    d.boostTime = DRIFT_CONFIG.boost1
    for (let i = 0; i < 120 * 2; i++)
      stepDrift(d, driftInput({ holding: false }), dt)
    expect(d.boostTime).toBe(0)
    expect(isBoosting(d)).toBe(false)
  })

  it('can start a new drift immediately after boost ends', () => {
    const d = createDrift()
    d.boostTime = 0.01
    for (let i = 0; i < 5; i++) stepDrift(d, driftInput({ holding: false }), dt)
    const r = stepDrift(d, driftInput(), dt)
    expect(r.event).toBe('drift-start')
    expect(d.active).toBe(true)
  })
})
