import * as THREE from 'three'

// Sideline TV-broadcast camera: fixed on one touchline, elevated in the stand, with a long
// lens for the flat, mildly-converging broadcast look. It pans along the pitch's length
// tracking the ball but never swings to the other side or behind a player.

const BASE_HEIGHT = 17.5
const BASE_SIDE_DISTANCE = 33
const FOCUS_SMOOTH = 0.02 // lazy broadcast-operator pan, not an instant snap
const ZOOM_SMOOTH = 0.03
const MIN_SPREAD = 12
const MAX_SPREAD = 50
const MAX_ZOOM_SCALE = 1.28
const MIN_ZOOM_SCALE = 0.94

// Lead the ball slightly in the direction it is travelling, like an operator anticipating
// the pass, but never so far that the play leaves the frame.
const LEAD_FACTOR = 0.28
const MAX_LEAD = 9

// Transient push-in on goals, decaying back to 1 over PULSE_DECAY_MS.
const PULSE_ZOOM_IN = 0.84
const PULSE_DECAY_MS = 1600

// The camera can follow the play most of the way to either goal; only the very corners
// are left alone, where the shot would be mostly touchline and stand.
const FOCUS_LIMIT_X = 34
const FOCUS_LIMIT_Z = 15

export class CameraRig {
  constructor(camera) {
    this.camera = camera
    this.focus = new THREE.Vector3(0, 0, 0)
    this.zoom = 1
    this.initialised = false
    this.pulseAmount = 0
    this.lastBall = new THREE.Vector3(0, 0, 0)
    this.lead = new THREE.Vector2(0, 0)
  }

  /** Kick the transient push-in, used on goals. */
  boost() {
    this.pulseAmount = 1
  }

  /** Backwards-compatible alias for {@link boost}. */
  pulse() {
    this.boost()
  }

  /**
   * @param {number} ballX ball position along the length axis
   * @param {number} ballZ ball position along the width axis
   * @param {number} spread metres from the ball to the outer edge of the play, used to
   *   widen the shot when the teams stretch the pitch
   * @param {number} dtMs elapsed milliseconds
   */
  update(ballX, ballZ, spread, dtMs) {
    const dt = Math.max(dtMs / 1000, 0.0001)

    if (this.initialised) {
      const vx = clamp((ballX - this.lastBall.x) / dt, -60, 60)
      const vz = clamp((ballZ - this.lastBall.z) / dt, -60, 60)
      const leadX = clamp(vx * LEAD_FACTOR, -MAX_LEAD, MAX_LEAD)
      const leadZ = clamp(vz * LEAD_FACTOR * 0.5, -MAX_LEAD * 0.5, MAX_LEAD * 0.5)
      const blend = 1 - Math.exp(-dt * 3)
      this.lead.x += (leadX - this.lead.x) * blend
      this.lead.y += (leadZ - this.lead.y) * blend
    }
    this.lastBall.set(ballX, 0, ballZ)

    const targetFocus = new THREE.Vector3(
      clamp(ballX + this.lead.x, -FOCUS_LIMIT_X, FOCUS_LIMIT_X),
      0,
      clamp(ballZ + this.lead.y, -FOCUS_LIMIT_Z, FOCUS_LIMIT_Z),
    )
    const zoomT = clamp01((spread - MIN_SPREAD) / (MAX_SPREAD - MIN_SPREAD))
    const targetZoom = MIN_ZOOM_SCALE + zoomT * (MAX_ZOOM_SCALE - MIN_ZOOM_SCALE)

    if (!this.initialised) {
      this.focus.copy(targetFocus)
      this.zoom = targetZoom
      this.initialised = true
    } else {
      this.focus.lerp(targetFocus, clamp01(1 - Math.pow(FOCUS_SMOOTH, dt)))
      this.zoom += (targetZoom - this.zoom) * clamp01(1 - Math.pow(ZOOM_SMOOTH, dt))
    }

    this.pulseAmount = Math.max(0, this.pulseAmount - dtMs / PULSE_DECAY_MS)
    const pulseScale = 1 - this.pulseAmount * (1 - PULSE_ZOOM_IN)
    const effectiveZoom = this.zoom * pulseScale

    this.camera.position.set(
      this.focus.x,
      BASE_HEIGHT * effectiveZoom,
      this.focus.z + BASE_SIDE_DISTANCE * effectiveZoom,
    )
    this.camera.lookAt(this.focus.x, 0.9, this.focus.z)
  }
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}
