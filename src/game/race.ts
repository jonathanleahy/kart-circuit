export type RaceEvent = 'none' | 'checkpoint' | 'lap' | 'finish'

export interface RaceState {
  lap: number
  totalLaps: number
  checkpointCount: number
  nextCheckpoint: number
  started: boolean
  finished: boolean
  currentLapTime: number
  lapTimes: number[]
}

export function createRace(totalLaps: number, checkpointCount: number): RaceState {
  if (totalLaps < 1) throw new Error('totalLaps must be >= 1')
  if (checkpointCount < 2) throw new Error('checkpointCount must be >= 2')
  return {
    lap: 1,
    totalLaps,
    checkpointCount,
    nextCheckpoint: 1,
    started: false,
    finished: false,
    currentLapTime: 0,
    lapTimes: [],
  }
}

export function raceTick(race: RaceState, dt: number): void {
  if (!race.started || race.finished) return
  race.currentLapTime += dt
}

export function updateRace(
  race: RaceState,
  sector: number,
): RaceEvent {
  if (race.finished) return 'none'
  const n = race.checkpointCount
  const s = ((sector % n) + n) % n

  if (race.nextCheckpoint === n) {
    if (s === 0) {
      race.lapTimes.push(race.currentLapTime)
      race.currentLapTime = 0
      race.nextCheckpoint = 1
      if (race.lap >= race.totalLaps) {
        race.finished = true
        return 'finish'
      }
      race.lap++
      return 'lap'
    }
    return 'none'
  }

  if (s === race.nextCheckpoint) {
    race.nextCheckpoint++
    return 'checkpoint'
  }
  return 'none'
}
