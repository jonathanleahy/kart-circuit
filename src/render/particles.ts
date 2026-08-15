import * as THREE from 'three'

const POOL = 260

interface Particle {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  life: number
  maxLife: number
  size: number
  floorY: number
}

const tmpColor = new THREE.Color()
const tmpMatrix = new THREE.Matrix4()
const tmpQuat = new THREE.Quaternion()
const tmpScale = new THREE.Vector3()
const tmpPos = new THREE.Vector3()
const zeroScale = new THREE.Matrix4().makeScale(0, 0, 0)

export class Particles {
  private mesh: THREE.InstancedMesh
  private pool: Particle[] = []
  private cursor = 0
  private anyAlive = false

  constructor(scene: THREE.Scene) {
    const geo = new THREE.SphereGeometry(0.14, 4, 3)
    const mat = new THREE.MeshBasicMaterial()
    this.mesh = new THREE.InstancedMesh(geo, mat, POOL)
    this.mesh.frustumCulled = false
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    for (let i = 0; i < POOL; i++) {
      this.pool.push({
        x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0,
        life: 0, maxLife: 1, size: 1, floorY: 0,
      })
      this.mesh.setMatrixAt(i, zeroScale)
      this.mesh.setColorAt(i, tmpColor.setHex(0xffffff))
    }
    scene.add(this.mesh)
  }

  spawn(
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    color: number, life: number, size: number, floorY: number,
  ): void {
    const idx = this.cursor
    const p = this.pool[idx]
    this.cursor = (this.cursor + 1) % POOL
    p.x = x; p.y = y; p.z = z
    p.vx = vx; p.vy = vy; p.vz = vz
    p.life = life
    p.maxLife = life
    p.size = size
    p.floorY = floorY
    this.anyAlive = true
    this.mesh.setColorAt(idx, tmpColor.setHex(color))
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
  }

  update(dt: number): void {
    if (!this.anyAlive) return
    let alive = false
    for (let i = 0; i < POOL; i++) {
      const p = this.pool[i]
      if (p.life <= 0) continue
      p.life -= dt
      if (p.life <= 0) {
        this.mesh.setMatrixAt(i, zeroScale)
        continue
      }
      alive = true
      p.vy -= 9 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt
      if (p.y < p.floorY) {
        p.y = p.floorY
        p.vy = 0
      }
      const k = (p.life / p.maxLife) * p.size
      tmpPos.set(p.x, p.y, p.z)
      tmpScale.set(k, k, k)
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale)
      this.mesh.setMatrixAt(i, tmpMatrix)
    }
    this.anyAlive = alive
    this.mesh.instanceMatrix.needsUpdate = true
  }
}
