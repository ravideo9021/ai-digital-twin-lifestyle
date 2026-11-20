import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { gaussian, mulberry32 } from '../lib/math'
import { useStore, type Region } from '../store/store'

const RID: Record<Region, number> = { brain: 1, heart: 2, lungs: 3, gut: 4, body: 0, legs: 5 }

export interface Callout {
  region: Region
  anchor: [number, number, number]
  side: 'l' | 'r'
  title: string
  value: string
  unit?: string
  color: string
  onClick?: () => void
}

type V3 = [number, number, number]

function buildBody() {
  const rand = mulberry32(2024)
  const pos: number[] = []
  const rnd: number[] = []
  const reg: number[] = []
  const kind: number[] = []
  const push = (p: V3, region: number, k = 0) => {
    pos.push(p[0], p[1], p[2])
    rnd.push(rand())
    reg.push(region)
    kind.push(k)
  }
  const ellipsoid = (n: number, c: V3, r: V3, region: number, k = 0, fill = false) => {
    for (let i = 0; i < n; i++) {
      let x = gaussian(rand)
      let y = gaussian(rand)
      let z = gaussian(rand)
      const l = Math.hypot(x, y, z) || 1
      const s = fill ? Math.cbrt(rand()) : 1 - rand() * 0.03
      x = (x / l) * s
      y = (y / l) * s
      z = (z / l) * s
      push([c[0] + x * r[0], c[1] + y * r[1], c[2] + z * r[2]], region, k)
    }
  }
  const capsule = (n: number, a: V3, b: V3, r0: number, r1: number, region: number | ((p: V3) => number), rx = 1, rz = 1) => {
    const ax = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2])
    const len = ax.length()
    ax.normalize()
    const ref = Math.abs(ax.z) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1)
    const u = new THREE.Vector3().crossVectors(ax, ref).normalize()
    const v = new THREE.Vector3().crossVectors(ax, u).normalize()
    for (let i = 0; i < n; i++) {
      const t = rand()
      const r = r0 + (r1 - r0) * t
      const th = rand() * Math.PI * 2
      const cu = Math.cos(th) * r * rx
      const cv = Math.sin(th) * r * rz
      const p: V3 = [a[0] + ax.x * len * t + u.x * cu + v.x * cv, a[1] + ax.y * len * t + u.y * cu + v.y * cv, a[2] + ax.z * len * t + u.z * cu + v.z * cv]
      push(p, typeof region === 'function' ? region(p) : region)
    }
  }
  const torso = (p: V3) => (p[1] > 1.2 ? 3 : 4)
  const k = 1.7
  ellipsoid(1700 * k, [0, 1.73, 0], [0.098, 0.125, 0.112], 1)
  capsule(220 * k, [0, 1.54, 0], [0, 1.63, 0], 0.048, 0.044, 0)
  capsule(2700 * k, [0, 1.17, 0], [0, 1.49, 0], 0.148, 0.192, torso, 1.1, 0.62)
  capsule(1500 * k, [0, 0.93, 0], [0, 1.17, 0], 0.16, 0.148, torso, 1.08, 0.66)
  capsule(420 * k, [-0.2, 1.485, 0], [0.2, 1.485, 0], 0.055, 0.055, 3, 1, 0.9)
  ellipsoid(700 * k, [0, 0.9, 0], [0.175, 0.1, 0.11], 4)
  for (const s of [-1, 1]) {
    capsule(680 * k, [0.215 * s, 1.47, 0], [0.285 * s, 1.17, -0.01], 0.05, 0.041, 0)
    capsule(520 * k, [0.285 * s, 1.17, -0.01], [0.325 * s, 0.89, 0.05], 0.04, 0.03, 0)
    ellipsoid(160 * k, [0.338 * s, 0.81, 0.06], [0.028, 0.06, 0.02], 0)
    capsule(1150 * k, [0.09 * s, 0.88, 0], [0.105 * s, 0.48, 0.01], 0.085, 0.058, 5)
    capsule(820 * k, [0.105 * s, 0.48, 0.01], [0.115 * s, 0.08, -0.01], 0.056, 0.038, 5)
    capsule(220 * k, [0.115 * s, 0.035, -0.03], [0.125 * s, 0.03, 0.12], 0.032, 0.028, 5)
  }
  ellipsoid(700, [0, 1.75, -0.005], [0.075, 0.07, 0.085], 1, 1, true)
  ellipsoid(600, [0.05, 1.36, 0.05], [0.045, 0.05, 0.04], 2, 1, true)
  ellipsoid(600, [-0.085, 1.37, 0], [0.065, 0.11, 0.06], 3, 1, true)
  ellipsoid(600, [0.105, 1.38, -0.01], [0.06, 0.105, 0.055], 3, 1, true)
  for (let i = 0; i < 900; i++) {
    const t = rand() * Math.PI * 7
    const rr = 0.04 + 0.055 * (0.5 + 0.5 * Math.sin(t * 0.7))
    push([Math.cos(t) * rr + gaussian(rand) * 0.008, 1.02 + (t / (Math.PI * 7)) * 0.13 + gaussian(rand) * 0.008, Math.sin(t) * rr * 0.6 + 0.02], 4, 1)
  }
  return { pos, rnd, reg, kind }
}

const vert = /* glsl */ `
uniform float uTime; uniform float uFocus; uniform float uPulse; uniform float uBreath; uniform float uSize; uniform float uReveal;
attribute float aRand; attribute float aRegion; attribute float aKind;
varying vec3 vColor; varying float vAlpha;
vec3 organ(float r){
  if (r < 1.5) return vec3(0.39,0.82,1.0);
  if (r < 2.5) return vec3(1.0,0.22,0.37);
  if (r < 3.5) return vec3(0.62,0.78,1.0);
  if (r < 4.5) return vec3(0.19,0.82,0.35);
  return vec3(1.0,0.62,0.04);
}
void main(){
  vec3 p = position;
  if (p.y > 1.0 && p.y < 1.52) { float b = uBreath * 0.012 * smoothstep(1.0, 1.35, p.y); p.x *= 1.0 + b; p.z *= 1.0 + b * 1.6; }
  if (aRegion > 1.5 && aRegion < 2.5) { vec3 hc = vec3(0.05,1.36,0.05); p = hc + (p-hc)*(1.0+uPulse*0.16); }
  p += vec3(sin(uTime*0.9 + aRand*40.0), 0.0, cos(uTime*0.8 + aRand*30.0)) * 0.002;
  float reveal = smoothstep(p.y - 0.25, p.y, uReveal - aRand * 0.2);
  vec4 mv = modelViewMatrix * vec4(p,1.0);
  float depth = clamp((-mv.z - 5.15) / 0.7, 0.0, 1.0);
  vec3 skin = mix(vec3(0.55,0.64,0.84), vec3(0.93,0.96,1.0), smoothstep(0.0, 1.9, p.y));
  vec3 col = aKind > 0.5 ? organ(aRegion) : skin;
  float a = (aKind > 0.5 ? 0.55 : 0.24) * (0.55 + 0.45 * aRand);
  float sheen = smoothstep(0.2, 0.0, abs(p.y - (mod(uTime * 0.14, 3.0) - 0.4))) * 0.2;
  if (uFocus > -0.5) {
    if (abs(aRegion - uFocus) < 0.5) { col = mix(col, organ(uFocus), aKind > 0.5 ? 0.0 : 0.85); a *= 2.0; }
    else a *= 0.26;
  }
  if (aRegion > 1.5 && aRegion < 2.5 && aKind > 0.5) a *= 0.7 + uPulse * 0.9;
  vColor = col + sheen;
  vAlpha = a * mix(1.0, 0.32, depth) * reveal;
  gl_PointSize = uSize * (0.6 + aRand * 0.7) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`
const frag = /* glsl */ `
varying vec3 vColor; varying float vAlpha;
void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vColor, vAlpha * smoothstep(0.5, 0.05, d)); }`

export function Hologram({ callouts, hr, resp }: { callouts: Callout[]; hr: number; resp: number }) {
  const host = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(SVGPathElement | null)[]>([])
  const dotRefs = useRef<(SVGCircleElement | null)[]>([])
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([])
  const focus = useStore((s) => s.focus)
  const setFocus = useStore((s) => s.setFocus)
  const live = useRef({ hr, resp, focus, callouts })
  live.current = { hr, resp, focus, callouts }

  useEffect(() => {
    const el = host.current!
    const W = () => el.clientWidth
    const H = () => el.clientHeight
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    const dpr = Math.min(2, window.devicePixelRatio)
    renderer.setPixelRatio(dpr)
    renderer.setSize(W(), H())
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    el.prepend(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, W() / H(), 0.1, 50)
    camera.position.set(0, 1.0, 5.5)
    camera.lookAt(0, 0.82, 0)

    const body = new THREE.Group()
    scene.add(body)
    const b = buildBody()
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3))
    geo.setAttribute('aRand', new THREE.Float32BufferAttribute(b.rnd, 1))
    geo.setAttribute('aRegion', new THREE.Float32BufferAttribute(b.reg, 1))
    geo.setAttribute('aKind', new THREE.Float32BufferAttribute(b.kind, 1))
    const uniforms = { uTime: { value: 0 }, uFocus: { value: -1 }, uPulse: { value: 0 }, uBreath: { value: 0 }, uSize: { value: 18 * dpr }, uReveal: { value: -0.3 } }
    body.add(new THREE.Points(geo, new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })))

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.15, 64),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
        fragmentShader: `varying vec2 vUv; void main(){ float d = distance(vUv, vec2(0.5)) * 2.0; float a = pow(1.0 - clamp(d,0.0,1.0), 2.6) * 0.26; gl_FragColor = vec4(0.5,0.64,1.0,a);} `,
      }),
    )
    floor.rotation.x = -Math.PI / 2
    scene.add(floor)

    let rotY = 0.5
    let vel = 0
    let dragging = false
    let lastX = 0
    let tiltX = 0
    let tiltTarget = 0
    let parallax = 0
    let parallaxTarget = 0
    const down = (e: PointerEvent) => {
      dragging = true
      lastX = e.clientX
      el.style.cursor = 'grabbing'
    }
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const nx = (e.clientX - r.left) / r.width - 0.5
      const ny = (e.clientY - r.top) / r.height - 0.5
      if (Math.abs(nx) < 0.6 && Math.abs(ny) < 0.6) {
        tiltTarget = ny * 0.1
        parallaxTarget = nx * 0.3
      }
      if (!dragging) return
      vel = (e.clientX - lastX) * 0.006
      rotY += vel
      lastX = e.clientX
    }
    const up = () => {
      dragging = false
      el.style.cursor = 'grab'
    }
    el.style.cursor = 'grab'
    renderer.domElement.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)

    const ro = new ResizeObserver(() => {
      renderer.setSize(W(), H())
      camera.aspect = W() / H()
      camera.updateProjectionMatrix()
    })
    ro.observe(el)

    const clock = new THREE.Clock()
    const tmp = new THREE.Vector3()
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.05, clock.getDelta())
      const t = clock.elapsedTime
      uniforms.uTime.value = t
      uniforms.uReveal.value = Math.min(2.4, -0.3 + t * 1.25)
      const phase = (t * live.current.hr) / 60
      const f = phase - Math.floor(phase)
      uniforms.uPulse.value = Math.exp(-f * 12) + 0.45 * (f > 0.18 ? Math.exp(-(f - 0.18) * 14) : 0)
      uniforms.uBreath.value = Math.sin((t * live.current.resp * Math.PI * 2) / 60)
      uniforms.uFocus.value = live.current.focus ? RID[live.current.focus] : -1
      if (!dragging) {
        vel *= 0.93
        rotY += vel + dt * 0.1
      }
      tiltX += (tiltTarget - tiltX) * 0.05
      parallax += (parallaxTarget - parallax) * 0.05
      body.rotation.set(tiltX, rotY + parallax, 0)
      renderer.render(scene, camera)

      const w = W()
      const h = H()
      body.updateMatrixWorld()
      live.current.callouts.forEach((c, i) => {
        tmp.set(...c.anchor)
        body.localToWorld(tmp)
        tmp.project(camera)
        const sx = (tmp.x * 0.5 + 0.5) * w
        const sy = (-tmp.y * 0.5 + 0.5) * h
        const lab = labelRefs.current[i]
        const line = lineRefs.current[i]
        const dot = dotRefs.current[i]
        if (!lab || !line || !dot) return
        const lw = lab.offsetWidth
        const lh = lab.offsetHeight
        const ly = Math.max(16, Math.min(h - lh - 16, sy - lh / 2))
        const m = w < 520 ? 10 : 20
        const lx = c.side === 'l' ? m : w - lw - m
        lab.style.transform = `translate3d(${lx}px, ${ly}px, 0)`
        const ex = c.side === 'l' ? lx + lw : lx
        const ey = ly + lh / 2
        const mx = c.side === 'l' ? ex + 24 : ex - 24
        line.setAttribute('d', `M${ex},${ey} L${mx},${ey} L${sx},${sy}`)
        dot.setAttribute('cx', `${sx}`)
        dot.setAttribute('cy', `${sy}`)
      })
    }
    loop()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      geo.dispose()
      floor.geometry.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div ref={host} className="absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {callouts.map((c, i) => (
          <g key={c.region} style={{ opacity: focus && focus !== c.region ? 0.15 : 1, transition: 'opacity .4s' }}>
            <path ref={(e) => { lineRefs.current[i] = e }} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
            <circle ref={(e) => { dotRefs.current[i] = e }} r={3.5} fill="#fff" />
          </g>
        ))}
      </svg>
      {callouts.map((c, i) => (
        <button
          key={c.region}
          ref={(e) => { labelRefs.current[i] = e }}
          onPointerEnter={() => setFocus(c.region)}
          onPointerLeave={() => setFocus(null)}
          onFocus={() => setFocus(c.region)}
          onBlur={() => setFocus(null)}
          onClick={c.onClick}
          className={`absolute left-0 top-0 sm:min-w-[124px] px-2.5 py-1.5 sm:px-3.5 sm:py-2.5 rounded-xl sm:rounded-2xl text-left bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_30px_rgba(0,0,0,0.4)] ring-1 ring-white/10 transition-[background-color,opacity] duration-300 ${c.side === 'r' ? 'text-right' : ''}`}
          style={{ opacity: focus && focus !== c.region ? 0.3 : 1, willChange: 'transform' }}
        >
          <div className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-white/60 ${c.side === 'r' ? 'justify-end' : ''}`}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
            {c.title}
          </div>
          <div className="mt-1 text-white leading-none">
            <span className="num text-[16px] sm:text-[22px] font-semibold">{c.value}</span>
            {c.unit && <span className="text-[11px] sm:text-[12px] font-semibold text-white/55 ml-1">{c.unit}</span>}
          </div>
        </button>
      ))}
    </div>
  )
}
