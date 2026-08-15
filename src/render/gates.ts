import * as THREE from 'three'
import type { TrackDef } from '../game/track'
import { worldPosAt } from '../game/track'
import { elevationAt } from '../game/elevation'

export interface Gates {
  group: THREE.Group
  gatePositions: Array<{ x: number; z: number }>
  highlight(next: number, time: number): void
}

// Checkpoint arches at each sector boundary plus a taller start gate.
export function createGates(track: TrackDef, checkpointCount: number): Gates {
  const group = new THREE.Group()
  const gateMats: THREE.MeshLambertMaterial[] = []
  const gatePositions: Array<{ x: number; z: number }> = []
  const baseColor = new THREE.Color(0x35506e)
  const hotColor = new THREE.Color(0xffb347)

  for (let s = 0; s < checkpointCount; s++) {
    const progress = s / checkpointCount
    const pos = worldPosAt(track, progress, 0)
    const ahead = worldPosAt(track, progress + 0.002, 0)
    const heading = Math.atan2(ahead.x - pos.x, ahead.z - pos.z)
    gatePositions.push(pos)

    const isStart = s === 0
    const height = isStart ? 7.5 : 5.5
    const span = track.halfWidth + 3.5

    const pillarGeo = new THREE.BoxGeometry(0.7, height, 0.7)
    const mat = new THREE.MeshLambertMaterial({ color: baseColor.clone() })
    gateMats.push(mat)

    const left = new THREE.Mesh(pillarGeo, mat)
    left.position.set(-span, height / 2, 0)
    const right = new THREE.Mesh(pillarGeo, mat)
    right.position.set(span, height / 2, 0)
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(span * 2 + 0.7, 0.9, 0.7),
      mat,
    )
    top.position.set(0, height, 0)

    const gate = new THREE.Group()
    gate.add(left, right, top)
    gate.position.set(pos.x, elevationAt(progress), pos.z)
    gate.rotation.y = heading
    group.add(gate)
  }

  return {
    group,
    gatePositions,
    highlight(next: number, time: number) {
      for (let i = 0; i < gateMats.length; i++) {
        if (i === next % gateMats.length) {
          gateMats[i].color.copy(baseColor).lerp(hotColor, 0.5 + 0.5 * Math.sin(time * 6))
        } else {
          gateMats[i].color.copy(baseColor)
        }
      }
    },
  }
}
