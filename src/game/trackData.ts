import { closedCatmullRom } from './spline'
import { buildTrack, type TrackDef } from './track'

export const TRACK_HALF_WIDTH = 9

export const TRACK_CONTROL_POINTS = [
  { x: 0, z: 0 },
  { x: 70, z: -8 },
  { x: 135, z: -35 },
  { x: 165, z: -90 },
  { x: 145, z: -145 },
  { x: 85, z: -160 },
  { x: 25, z: -140 },
  { x: -30, z: -155 },
  { x: -95, z: -150 },
  { x: -135, z: -105 },
  { x: -125, z: -45 },
  { x: -70, z: -12 },
]

export function buildRaceTrack(): TrackDef {
  return buildTrack(closedCatmullRom(TRACK_CONTROL_POINTS, 22), TRACK_HALF_WIDTH)
}
