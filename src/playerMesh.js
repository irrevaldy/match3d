import * as THREE from 'three'

// Low-poly articulated footballer. The original renderer hard-coded two team colours and
// rolled appearance with Math.random; this version accepts a kit directly and can take a
// stable seed so a player keeps the same skin/hair across re-renders and substitutions.

const TEAM_COLOR = { A: 0xd9342b, B: 0x2b5fd9 }
const GK_SHIRT_COLOR = 0xf5d020
const DEFAULT_SHORTS_COLOR = 0x1c1c1c
const DEFAULT_SHIRT_COLOR = 0xffffff
const BOOT_COLOR = 0x121212

const SKIN_COLORS = [0xe3ac80, 0xc98a5e, 0x8d5a3c, 0x5c3a25, 0xf0c9a0]
const HAIR_COLORS = [0x0f0b09, 0x2e1c10, 0x5c3a1e, 0x8a5a2b, 0xc9a227, 0x6b6b6b]
const HAIR_STYLES = ['bald', 'cap', 'spiky', 'buzz']

const HIP_HEIGHT = 0.9
const SHOULDER_HEIGHT = 1.45
const HEAD_RADIUS = 0.16
const LEG_RADIUS = 0.095
const THIGH_LENGTH = 0.42
const SHIN_LENGTH = 0.4
const FOOT_LENGTH = 0.24
const FOOT_HEIGHT = 0.06
const FOOT_WIDTH = 0.16
const ARM_RADIUS = 0.065
const ARM_LENGTH = SHOULDER_HEIGHT - HIP_HEIGHT - 0.1
const TORSO_RADIUS = 0.24
const TORSO_BASE_Y = (HIP_HEIGHT + SHOULDER_HEIGHT) / 2 + 0.05
const HIP_SPACING = 0.13
const SHOULDER_SPACING = 0.3

/**
 * @param {object} [options]
 * @param {'A'|'B'} [options.team] legacy team id; used when no explicit shirt colour is given
 * @param {number|string} [options.shirtColor]
 * @param {number|string} [options.shortsColor]
 * @param {string} [options.role] 'GK' picks the keeper shirt
 * @param {number} [options.seed] stable appearance seed; omit for random appearance
 */
export function createPlayerMesh(options = {}) {
  const { team, role, seed, shirtColor, shortsColor } = options
  const isKeeper = role === 'GK'
  const resolvedShirt =
    shirtColor ?? (isKeeper ? GK_SHIRT_COLOR : team ? TEAM_COLOR[team] : DEFAULT_SHIRT_COLOR)

  const group = new THREE.Group()
  const random = seed === undefined ? Math.random : mulberry32(seed)

  const shirtMat = new THREE.MeshStandardMaterial({
    color: isKeeper ? GK_SHIRT_COLOR : resolvedShirt,
    roughness: 0.65,
  })
  const shortsMat = new THREE.MeshStandardMaterial({
    color: shortsColor ?? DEFAULT_SHORTS_COLOR,
    roughness: 0.7,
  })
  const skinMat = new THREE.MeshStandardMaterial({
    color: SKIN_COLORS[Math.floor(random() * SKIN_COLORS.length)],
    roughness: 0.75,
  })
  const bootMat = new THREE.MeshStandardMaterial({ color: BOOT_COLOR, roughness: 0.5 })
  const hairStyle = HAIR_STYLES[Math.floor(random() * HAIR_STYLES.length)]
  const hairColor = HAIR_COLORS[Math.floor(random() * HAIR_COLORS.length)]

  const thighGeo = new THREE.CapsuleGeometry(LEG_RADIUS, Math.max(THIGH_LENGTH - LEG_RADIUS * 2, 0.06), 4, 8)
  const shinGeo = new THREE.CapsuleGeometry(LEG_RADIUS * 0.85, Math.max(SHIN_LENGTH - LEG_RADIUS * 2, 0.06), 4, 8)
  const footGeo = new THREE.BoxGeometry(FOOT_WIDTH, FOOT_HEIGHT, FOOT_LENGTH)

  // Hip pivot -> knee pivot -> shin + foot: the knee bend during the forward recovery
  // swing is what sells a run cycle; a rigid hip-only swing just lifts the whole leg.
  const hipPivots = []
  const kneePivots = []
  for (const x of [-HIP_SPACING, HIP_SPACING]) {
    const hipPivot = new THREE.Group()
    hipPivot.position.set(x, HIP_HEIGHT, 0)

    const thigh = new THREE.Mesh(thighGeo, shortsMat)
    thigh.position.y = -THIGH_LENGTH / 2
    thigh.castShadow = true
    hipPivot.add(thigh)

    const kneePivot = new THREE.Group()
    kneePivot.position.y = -THIGH_LENGTH
    hipPivot.add(kneePivot)

    const shin = new THREE.Mesh(shinGeo, skinMat)
    shin.position.y = -SHIN_LENGTH / 2
    shin.castShadow = true
    kneePivot.add(shin)

    const foot = new THREE.Mesh(footGeo, bootMat)
    foot.position.set(0, -SHIN_LENGTH - FOOT_HEIGHT / 2, FOOT_LENGTH * 0.28)
    foot.castShadow = true
    kneePivot.add(foot)

    group.add(hipPivot)
    hipPivots.push(hipPivot)
    kneePivots.push(kneePivot)
  }

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(TORSO_RADIUS, SHOULDER_HEIGHT - HIP_HEIGHT - TORSO_RADIUS * 0.6, 4, 8),
    shirtMat,
  )
  torso.position.set(0, TORSO_BASE_Y, 0)
  torso.castShadow = true
  group.add(torso)

  const armGeo = new THREE.CapsuleGeometry(ARM_RADIUS, Math.max(ARM_LENGTH - ARM_RADIUS * 2, 0.08), 3, 6)
  const armPivots = []
  for (const x of [-SHOULDER_SPACING, SHOULDER_SPACING]) {
    const pivot = new THREE.Group()
    pivot.position.set(x, SHOULDER_HEIGHT, 0)
    const arm = new THREE.Mesh(armGeo, shirtMat)
    arm.position.y = -ARM_LENGTH / 2
    arm.castShadow = true
    pivot.add(arm)
    group.add(pivot)
    armPivots.push(pivot)
  }

  const headY = SHOULDER_HEIGHT + HEAD_RADIUS + 0.02
  const head = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS, 14, 12), skinMat)
  head.position.set(0, headY, 0)
  head.castShadow = true
  group.add(head)

  // Two eyes on the front of the head, not one dark blob — reads as a face and makes the
  // facing direction obvious, since they're always on the forward side.
  const eyeGeo = new THREE.SphereGeometry(HEAD_RADIUS * 0.15, 8, 6)
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.4 })
  for (const ex of [-HEAD_RADIUS * 0.42, HEAD_RADIUS * 0.42]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat)
    eye.position.set(ex, headY + HEAD_RADIUS * 0.05, HEAD_RADIUS * 0.9)
    group.add(eye)
  }

  addHair(group, hairStyle, hairColor, headY)

  return {
    group,
    hipPivots,
    kneePivots,
    armPivots,
    torso,
    /** Height the mesh sits at when it isn't bobbing, set by the driver each frame. */
    groundY: 0,
    animPhase: random() * Math.PI * 2,
    /** Phase for the goal celebration (arm pumps and jumps). */
    celebratePhase: random() * Math.PI * 2,
  }
}

function addHair(group, style, color, headY) {
  if (style === 'bald') return
  const hairMat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 })

  if (style === 'cap') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(HEAD_RADIUS * 1.05, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
      hairMat,
    )
    cap.position.y = headY + HEAD_RADIUS * 0.1
    group.add(cap)
  } else if (style === 'buzz') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(HEAD_RADIUS * 1.02, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.42),
      hairMat,
    )
    cap.position.y = headY + HEAD_RADIUS * 0.2
    group.add(cap)
  } else if (style === 'spiky') {
    const spikeCount = 6
    const spikeGeo = new THREE.ConeGeometry(HEAD_RADIUS * 0.16, HEAD_RADIUS * 0.5, 6)
    for (let i = 0; i < spikeCount; i += 1) {
      const angle = (i / spikeCount) * Math.PI * 2
      const r = HEAD_RADIUS * 0.5
      const spike = new THREE.Mesh(spikeGeo, hairMat)
      spike.position.set(Math.cos(angle) * r, headY + HEAD_RADIUS * 0.75, Math.sin(angle) * r)
      spike.rotation.x = Math.sin(angle) * 0.35
      spike.rotation.z = -Math.cos(angle) * 0.35
      group.add(spike)
    }
  }
}

const MOVING_SPEED_THRESHOLD = 0.4
const STRIDE_BASE_HZ = 1.0
const STRIDE_SPEED_FACTOR = 0.3
const MAX_HIP_SWING = 0.55
const MAX_KNEE_BEND = 1.15
const ARM_SWING_RATIO = 0.75
const BOB_HEIGHT = 0.04

/**
 * Procedural run cycle. `speed` is the player's actual metres-per-second this frame, so a
 * jog and a sprint produce visibly different stride rates. The vertical bob is applied
 * relative to `mesh.groundY` rather than accumulated, so a player cannot slowly sink or
 * fly over a long match.
 *
 * `celebrate` (0..1) blends into a goal celebration: arms up and out, little jumps.
 */
export function animatePlayerMesh(mesh, speed, dtSeconds, celebrate = 0) {
  const celebration = Math.max(0, Math.min(1, celebrate))
  const running = 1 - celebration
  const isMoving = running > 0.5 && speed > MOVING_SPEED_THRESHOLD

  if (isMoving) {
    const strideHz = STRIDE_BASE_HZ + Math.min(speed, 9) * STRIDE_SPEED_FACTOR
    mesh.animPhase += dtSeconds * strideHz * Math.PI * 2
  }
  mesh.celebratePhase += dtSeconds * 8

  const phase = mesh.animPhase
  const swingAmount = isMoving ? Math.min(0.22 + speed * 0.035, MAX_HIP_SWING) : 0
  const cosPhase = Math.cos(phase)
  const swing0 = Math.sin(phase) * swingAmount
  const swing1 = -swing0
  const kneeAmount = isMoving ? MAX_KNEE_BEND : 0

  mesh.hipPivots[0].rotation.x = swing0 * running - 0.12 * celebration
  mesh.hipPivots[1].rotation.x = swing1 * running + 0.12 * celebration
  mesh.kneePivots[0].rotation.x = Math.max(0, cosPhase) * kneeAmount * running + 0.2 * celebration
  mesh.kneePivots[1].rotation.x = Math.max(0, -cosPhase) * kneeAmount * running + 0.2 * celebration

  mesh.armPivots[0].rotation.x = -swing0 * ARM_SWING_RATIO * running
  mesh.armPivots[1].rotation.x = swing0 * ARM_SWING_RATIO * running
  // Arms swing out and up in a V — the z rotation lifts each arm away from the body.
  mesh.armPivots[0].rotation.z = -1.95 * celebration
  mesh.armPivots[1].rotation.z = 1.95 * celebration

  const bob = isMoving ? Math.abs(Math.sin(phase)) * BOB_HEIGHT : 0
  const jump = Math.abs(Math.sin(mesh.celebratePhase)) * 0.5 * celebration
  mesh.torso.position.y = TORSO_BASE_Y + bob
  mesh.group.position.y = mesh.groundY + bob * running + jump
}

/**
 * Standalone indicator ring, repositioned each frame onto whichever player is currently
 * controlled — kept separate from the player mesh so switching control to a different
 * player does not require rebuilding meshes.
 */
export function createControlledRing() {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.55, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }),
  )
  ring.rotation.x = -Math.PI / 2
  return ring
}

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
