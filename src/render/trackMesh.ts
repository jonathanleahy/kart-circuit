import * as THREE from 'three'
import type { TrackDef } from '../game/track'
import { nearestOnTrack } from '../game/track'
import { elevationAt } from '../game/elevation'
import { makeAsphaltTexture } from './textures'

const ASPHALT_TILE_METERS = 9
const KERB_STRIPE_METERS = 2.6
const KERB_WIDTH = 1.1
const Y_ROAD = 0
const Y_KERB = 0.03
const Y_LINE = 0.06

function progressAt(track: TrackDef, i: number): number {
  return track.cumulative[i] / track.totalLength
}

function surfaceY(track: TrackDef, i: number): number {
  return elevationAt(progressAt(track, i)) + Y_ROAD
}

export function createTrackMeshes(track: TrackDef): THREE.Group {
  const group = new THREE.Group()
  group.add(roadRibbon(track))
  group.add(kerbs(track))
  group.add(startLine(track))
  group.add(trees(track))
  return group
}

function roadRibbon(track: TrackDef): THREE.Mesh {
  const pts = track.points
  const n = pts.length
  // n+1 cross-sections: the duplicated seam point carries the wrapped UV,
  // avoiding a full-texture smear across the final segment.
  const positions = new Float32Array((n + 1) * 3 * 2)
  const uvs = new Float32Array((n + 1) * 2 * 2)
  let dist = 0
  for (let i = 0; i <= n; i++) {
    const k = i % n
    const a = pts[k]
    const b = pts[(k + 1) % n]
    const dx = b.x - a.x
    const dz = b.z - a.z
    const len = Math.hypot(dx, dz)
    const rx = -dz / len
    const rz = dx / len
    const hw = track.halfWidth
    const y = i === n ? surfaceY(track, 0) : surfaceY(track, i)
    positions.set([a.x + rx * hw, y, a.z + rz * hw], i * 6)
    positions.set([a.x - rx * hw, y, a.z - rz * hw], i * 6 + 3)
    const v = dist / ASPHALT_TILE_METERS
    uvs.set([0, v], i * 4)
    uvs.set([2, v], i * 4 + 2)
    if (i < n) dist += len
  }
  const indices: number[] = []
  for (let i = 0; i < n; i++) {
    indices.push(i * 2, (i + 1) * 2, i * 2 + 1, i * 2 + 1, (i + 1) * 2, (i + 1) * 2 + 1)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  const mat = new THREE.MeshLambertMaterial({ map: makeAsphaltTexture() })
  const mesh = new THREE.Mesh(geo, mat)
  return mesh
}

function kerbs(track: TrackDef): THREE.Mesh {
  const pts = track.points
  const n = pts.length
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const red = new THREE.Color(0xd8333a)
  const white = new THREE.Color(0xe8e8e8)
  let v = 0
  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % n]
    const dx = b.x - a.x
    const dz = b.z - a.z
    const len = Math.hypot(dx, dz)
    const rx = -dz / len
    const rz = dx / len
    const hw = track.halfWidth
    const yA = surfaceY(track, i)
    const yB = i + 1 === n ? surfaceY(track, 0) : surfaceY(track, i + 1)
    // flat color per quad -> crisp stripes tied to distance, not samples
    const cumMid = track.cumulative[i] + len / 2
    const c = Math.floor(cumMid / KERB_STRIPE_METERS) % 2 === 0 ? red : white
    for (const side of [1, -1]) {
      const o0 = hw * side
      const o1 = (hw + KERB_WIDTH) * side
      positions.push(
        a.x + rx * o0, yA + Y_KERB, a.z + rz * o0,
        a.x + rx * o1, yA + Y_KERB, a.z + rz * o1,
        b.x + rx * o0, yB + Y_KERB, b.z + rz * o0,
        b.x + rx * o1, yB + Y_KERB, b.z + rz * o1,
      )
      for (let k = 0; k < 4; k++) colors.push(c.r, c.g, c.b)
      indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3)
      v += 4
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  })
  return new THREE.Mesh(geo, mat)
}

function startLine(track: TrackDef): THREE.Mesh {
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const cols = 8
  const rows = 2
  const cellW = (track.halfWidth * 2) / cols
  const cellL = 2.5
  const p0 = track.points[0]
  const p1 = track.points[1]
  const dx = p1.x - p0.x
  const dz = p1.z - p0.z
  const len = Math.hypot(dx, dz)
  const fx = dx / len
  const fz = dz / len
  const rx = -fz
  const rz = fx
  const baseY = surfaceY(track, 0) + Y_LINE
  let v = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dark = (r + c) % 2 === 0
      const col = dark ? 0x1a1a1a : 0xf2f2f2
      const cx = p0.x + fx * (r * cellL)
      const cz = p0.z + fz * (r * cellL)
      const lx = -track.halfWidth + c * cellW
      positions.push(
        cx + rx * lx, baseY, cz + rz * lx,
        cx + rx * (lx + cellW), baseY, cz + rz * (lx + cellW),
        cx + fx * cellL + rx * lx, baseY, cz + fz * cellL + rz * lx,
        cx + fx * cellL + rx * (lx + cellW), baseY, cz + fz * cellL + rz * (lx + cellW),
      )
      for (let k = 0; k < 4; k++)
        colors.push(
          ((col >> 16) & 255) / 255,
          ((col >> 8) & 255) / 255,
          (col & 255) / 255,
        )
      indices.push(v, v + 1, v + 2, v + 2, v + 1, v + 3)
      v += 4
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true })
  return new THREE.Mesh(geo, mat)
}

function trees(track: TrackDef): THREE.Group {
  const group = new THREE.Group()
  const rng = mulberry32(1337)
  const candidates: Array<{ x: number; z: number; y: number }> = []
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const p of track.points) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minZ = Math.min(minZ, p.z)
    maxZ = Math.max(maxZ, p.z)
  }
  for (let i = 0; i < 400 && candidates.length < 60; i++) {
    const x = minX + rng() * (maxX - minX)
    const z = minZ + rng() * (maxZ - minZ)
    const q = nearestOnTrack(track, { x, z })
    if (Math.abs(q.lateral) > track.halfWidth + 12) {
      candidates.push({ x, z, y: elevationAt(q.progress) - 0.35 })
    }
  }
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.45, 2, 6)
  const foliageGeo = new THREE.ConeGeometry(2.6, 6, 7)
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 })
  const foliageMat = new THREE.MeshLambertMaterial({ color: 0x2e7d3a })
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, candidates.length)
  const foliage = new THREE.InstancedMesh(foliageGeo, foliageMat, candidates.length)
  const m = new THREE.Matrix4()
  candidates.forEach((p, i) => {
    const s = 0.8 + rng() * 0.7
    m.makeScale(s, s, s)
    m.setPosition(p.x, p.y + 1, p.z)
    trunks.setMatrixAt(i, m)
    m.makeScale(s, s, s)
    m.setPosition(p.x, p.y + 2 + 3 * s, p.z)
    foliage.setMatrixAt(i, m)
  })
  group.add(trunks, foliage)
  return group
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
