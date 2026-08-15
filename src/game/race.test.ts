import { describe, it, expect } from 'vitest'
import { createRace, raceTick, updateRace } from './race'

const CP = 4

describe('createRace', () => {
  it('starts not started, on lap 1, no checkpoint progress', () => {
    const r = createRace(3, CP)
    expect(r.lap).toBe(1)
    expect(r.totalLaps).toBe(3)
    expect(r.nextCheckpoint).toBe(1)
    expect(r.started).toBe(false)
    expect(r.finished).toBe(false)
    expect(r.currentLapTime).toBe(0)
    expect(r.lapTimes).toHaveLength(0)
  })
})

describe('updateRace checkpoints', () => {
  it('advances next checkpoint through the sectors in order', () => {
    const r = createRace(3, CP)
    expect(updateRace(r, 0)).toBe('none')
    expect(r.nextCheckpoint).toBe(1)
    expect(updateRace(r, 1)).toBe('checkpoint')
    expect(r.nextCheckpoint).toBe(2)
    expect(updateRace(r, 2)).toBe('checkpoint')
    expect(updateRace(r, 3)).toBe('checkpoint')
    expect(r.nextCheckpoint).toBe(CP)
  })

  it('ignores out-of-order sectors', () => {
    const r = createRace(3, CP)
    expect(updateRace(r, 2)).toBe('none')
    expect(updateRace(r, 3)).toBe('none')
    expect(r.nextCheckpoint).toBe(1)
  })

  it('re-entering an already-passed sector does nothing', () => {
    const r = createRace(3, CP)
    updateRace(r, 1)
    expect(updateRace(r, 0)).toBe('none')
    expect(updateRace(r, 1)).toBe('none')
    expect(r.nextCheckpoint).toBe(2)
  })

  it('completes a lap when crossing the start line with all checkpoints', () => {
    const r = createRace(3, CP)
    for (let s = 1; s < CP; s++) updateRace(r, s)
    expect(updateRace(r, 0)).toBe('lap')
    expect(r.lap).toBe(2)
    expect(r.nextCheckpoint).toBe(1)
    expect(r.lapTimes).toHaveLength(1)
  })

  it('does not complete a lap if a checkpoint was skipped', () => {
    const r = createRace(3, CP)
    updateRace(r, 1)
    updateRace(r, 3)
    expect(updateRace(r, 0)).toBe('none')
    expect(r.lap).toBe(1)
  })

  it('finishes after totalLaps and stops reporting events', () => {
    const r = createRace(2, CP)
    for (let lap = 0; lap < 2; lap++) {
      for (let s = 1; s < CP; s++) updateRace(r, s)
      updateRace(r, 0)
    }
    expect(r.finished).toBe(true)
    expect(r.lap).toBe(2)
    expect(r.lapTimes).toHaveLength(2)
    expect(updateRace(r, 1)).toBe('none')
  })
})

describe('raceTick', () => {
  it('does not accumulate time before start', () => {
    const r = createRace(3, CP)
    raceTick(r, 1.5)
    expect(r.currentLapTime).toBe(0)
  })

  it('accumulates time while started and unfinished', () => {
    const r = createRace(3, CP)
    r.started = true
    raceTick(r, 0.5)
    raceTick(r, 0.25)
    expect(r.currentLapTime).toBeCloseTo(0.75, 6)
  })

  it('resets lap time on lap completion and stops after finish', () => {
    const r = createRace(1, CP)
    r.started = true
    raceTick(r, 42)
    for (let s = 1; s < CP; s++) updateRace(r, s)
    updateRace(r, 0)
    expect(r.currentLapTime).toBe(0)
    expect(r.lapTimes[0]).toBeCloseTo(42, 6)
    raceTick(r, 5)
    expect(r.currentLapTime).toBe(0)
  })
})
