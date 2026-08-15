import * as THREE from 'three'

const MAX_MARKS = 400
const MARK_HALF_WIDTH = 0.16
const MARK_LENGTH = 0.55

// Ring buffer of dark quads laid on the road; alpha fades over time.
export class TireMarks {
  private mesh: THREE.Mesh
  private positions: Float32Array
  private colors: Float32Array
  private alphas: number[] = []
  private cursor = 0

  constructor(scene: THREE.Scene) {
    this.positions = new Float32Array(MAX_MARKS * 4 * 3)
    this.colors = new Float32Array(MAX_MARKS * 4 * 4)
    const indices: number[] = []
    for (let i = 0; i < MAX_MARKS; i++) {
      const v = i * 4
      indices.push(v, v + 1, v + 2, v + 2, v + 1, v + 3)
      this.alphas.push(0)
      for (let k = 0; k < 4; k++) {
        const o = (v + k) * 4
        this.colors[o] = 0.08
        this.colors[o + 1] = 0.08
        this.colors[o + 2] = 0.09
        this.colors[o + 3] = 0
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 4))
    geo.setIndex(indices)
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 1
    scene.add(this.mesh)
  }

  // One quad per rear wheel; heading is the kart heading, offset the wheel
  // lateral offset (+right / -right).
  addMark(
    x: number, y: number, z: number,
    heading: number, wheelOffset: number, strength: number,
  ): void {
    const i = this.cursor
    this.cursor = (this.cursor + 1) % MAX_MARKS
    this.alphas[i] = strength

    const cx = x - Math.cos(heading) * wheelOffset
    const cz = z + Math.sin(heading) * wheelOffset
    const fx = Math.sin(heading)
    const fz = Math.cos(heading)
    const rx = -Math.cos(heading)
    const rz = Math.sin(heading)

    const corners: Array<[number, number]> = [
      [MARK_HALF_WIDTH, MARK_LENGTH / 2],
      [-MARK_HALF_WIDTH, MARK_LENGTH / 2],
      [MARK_HALF_WIDTH, -MARK_LENGTH / 2],
      [-MARK_HALF_WIDTH, -MARK_LENGTH / 2],
    ]
    for (let k = 0; k < 4; k++) {
      const [lat, along] = corners[k]
      const o = (i * 4 + k) * 3
      this.positions[o] = cx + rx * lat + fx * along
      this.positions[o + 1] = y
      this.positions[o + 2] = cz + rz * lat + fz * along
    }
    ;(this.mesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
  }

  update(dt: number): void {
    let dirty = false
    for (let i = 0; i < MAX_MARKS; i++) {
      if (this.alphas[i] <= 0) continue
      this.alphas[i] = Math.max(0, this.alphas[i] - dt * 0.12)
      for (let k = 0; k < 4; k++) {
        this.colors[(i * 4 + k) * 4 + 3] = this.alphas[i]
      }
      dirty = true
    }
    if (dirty) {
      ;(this.mesh.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true
    }
  }
}
