import * as THREE from 'three'

export interface Clouds {
  group: THREE.Group
  update(dt: number): void
}

export function createClouds(): Clouds {
  const group = new THREE.Group()
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const puffGeo = new THREE.IcosahedronGeometry(1, 0)
  const rng = mulberry32(4242)

  for (let i = 0; i < 9; i++) {
    const cloud = new THREE.Group()
    const puffs = 2 + Math.floor(rng() * 3)
    for (let p = 0; p < puffs; p++) {
      const puff = new THREE.Mesh(puffGeo, mat)
      const s = 7 + rng() * 9
      puff.scale.set(s, s * 0.45, s * 0.8)
      puff.position.set(p * s * 0.7 - puffs * s * 0.3, rng() * 2, rng() * 4 - 2)
      cloud.add(puff)
    }
    cloud.position.set(
      rng() * 1500 - 750,
      65 + rng() * 40,
      rng() * 1500 - 750,
    )
    group.add(cloud)
  }

  return {
    group,
    update(dt: number) {
      for (const cloud of group.children) {
        cloud.position.x += 2.5 * dt
        if (cloud.position.x > 780) cloud.position.x = -780
      }
    },
  }
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
