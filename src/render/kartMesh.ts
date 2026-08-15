import * as THREE from 'three'

export interface KartRig {
  group: THREE.Group
  wheels: THREE.Mesh[]
  frontWheels: THREE.Mesh[]
  wheelRadius: number
}

export function createKartMesh(): KartRig {
  const group = new THREE.Group()
  group.rotation.order = 'YXZ'

  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xe23b3b })
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 2.6), bodyMat)
  body.position.y = 0.55
  group.add(body)

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.7), bodyMat)
  nose.position.set(0, 0.45, 1.55)
  group.add(nose)

  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.5, 0.8),
    new THREE.MeshLambertMaterial({ color: 0x222233 }),
  )
  seat.position.set(0, 0.9, -0.5)
  group.add(seat)

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xffd23e }),
  )
  helmet.position.set(0, 1.25, -0.35)
  group.add(helmet)

  const spoiler = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.1, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x9c2b2b }),
  )
  spoiler.position.set(0, 1.05, -1.25)
  group.add(spoiler)

  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.32, 10)
  wheelGeo.rotateZ(Math.PI / 2)
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x18181c })
  const positions: Array<[number, number, boolean]> = [
    [-0.82, 0.95, true],
    [0.82, 0.95, true],
    [-0.85, -0.95, false],
    [0.85, -0.95, false],
  ]
  const wheels: THREE.Mesh[] = []
  const frontWheels: THREE.Mesh[] = []
  for (const [x, z, isFront] of positions) {
    const w = new THREE.Mesh(wheelGeo, wheelMat)
    w.position.set(x, 0.36, z)
    // steer (Y) must be the outer rotation, spin (X) the inner
    w.rotation.order = 'YXZ'
    group.add(w)
    wheels.push(w)
    if (isFront) frontWheels.push(w)
  }

  return { group, wheels, frontWheels, wheelRadius: 0.36 }
}
