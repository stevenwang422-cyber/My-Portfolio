import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import * as THREE from 'three'
import { useScrollTo } from '../lib/ScrollContext.js'
import { resume } from '../data/resume.js'

// one section per planet, same order as BODY_DEFS
const SECTIONS = [
  { num: '01', label: 'About', zh: '关于', href: '#about', hue: '#ffc46b' },
  { num: '02', label: 'Experience', zh: '经历', href: '#experience', hue: '#e8623a' },
  { num: '03', label: 'Work', zh: '作品', href: '#work', hue: '#6fa8ff' },
]

// Open-source planetary maps from the three.js repo, pinned via jsDelivr
const TEX_BASE = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/'

// Figure-eight choreography — a periodic three-body solution
const BODY_DEFS = [
  {
    x: -0.97000436, y: 0.24308753, vx: 0.466203685, vy: 0.43236573,
    color: 0xffc46b,
    surface: {
      map: 'moon_1024.jpg', bump: 'moon_1024.jpg',
      tint: 0xd9a06b, roughness: 0.85, metalness: 0.05,
      atmosphere: 0xffb46b,
    },
  },
  {
    x: 0.97000436, y: -0.24308753, vx: 0.466203685, vy: 0.43236573,
    color: 0xe8623a,
    surface: {
      map: 'moon_1024.jpg', bump: 'moon_1024.jpg',
      tint: 0xb05a3a, roughness: 0.8, metalness: 0.02,
      atmosphere: null,
    },
  },
  {
    x: 0, y: 0, vx: -0.93240737, vy: -0.86473146,
    color: 0xf3efe7,
    surface: {
      map: 'earth_atmos_2048.jpg', normal: 'earth_normal_2048.jpg',
      tint: 0xffffff, roughness: 0.7, metalness: 0.0,
      atmosphere: 0x6fa8ff,
    },
  },
]

const PLANET_R = 0.16

// fresnel rim shell rendered inside-out → atmosphere limb glow
function makeAtmosphere(radius, color) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 48),
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) } },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying vec3 vNormal;
        void main() {
          float edge = clamp(0.66 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
          float rim = pow(edge, 4.5) * smoothstep(0.0, 0.3, edge);
          gl_FragColor = vec4(uColor, 1.0) * rim * 0.34;
        }`,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
  )
}

const TRAIL = 560
const DT = 0.0021
const SUBSTEPS = 2
const EPS2 = 0.0001

// round soft-edged star point (square Points pixels read as fake)
// soft, out-of-focus glowing sphere: a high-res white radial gradient with
// a smooth multi-stop falloff so stars read as defocused light, not pixels
function makeStarTexture() {
  const s = 128
  const c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  grad.addColorStop(0.0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.12, 'rgba(255,255,255,0.95)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)')
  grad.addColorStop(0.65, 'rgba(255,255,255,0.12)')
  grad.addColorStop(1.0, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.minFilter = THREE.LinearMipmapLinearFilter
  return tex
}

// whisper-thin volumetric nebula on an inside-out dome, shaded with fBm of
// 3D simplex noise (Ashima/Gustavson, public domain). Palette: absolute
// void → cosmic charcoal → ultra-diluted amber gold near the orbital plane.
function makeSkyDome() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(46, 48, 48),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec3 vDir;

        /* --- simplex noise 3D (Ashima Arts / Stefan Gustavson, MIT/PD) --- */
        vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
        vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
        vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v){
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
        float fbm(vec3 p){
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 5; i++){ v += a * (snoise(p) * 0.5 + 0.5); p *= 2.02; a *= 0.5; }
          return v;
        }

        void main(){
          vec3 drift  = vec3(uTime * 0.006, 0.0, -uTime * 0.004);
          float clouds = fbm(vDir * 1.7 + drift);
          float dust   = fbm(vDir * 3.4 + drift * 1.7 + 13.0);

          vec3 VOID      = vec3(0.0118, 0.0118, 0.0118); /* #030303 */
          vec3 CHARCOAL  = vec3(0.039,  0.039,  0.047);  /* #0a0a0c */
          vec3 AMBER     = vec3(0.078,  0.043,  0.008);  /* #140b02 */

          vec3 col = mix(VOID, CHARCOAL, smoothstep(0.34, 0.78, clouds));
          /* diluted amber, concentrated near the orbital plane (vDir.y ~ 0) */
          float band = smoothstep(0.55, 0.0, abs(vDir.y));
          col += AMBER * smoothstep(0.52, 0.92, dust) * band;
          gl_FragColor = vec4(col, 1.0);
        }`,
      side: THREE.BackSide,
      depthWrite: false,
    })
  )
}

// stellar color temperatures, weighted toward white/blue like deep-sky photos
const STAR_COLORS = [
  '#ffffff', '#ffffff', '#ffffff',
  '#cfd8ff', '#cfd8ff',
  '#aac4ff',
  '#fff2dc', '#fff2dc',
  '#ffd9a8',
  '#ffb46b',
]

const gauss = () => Math.random() + Math.random() + Math.random() - 1.5

export default function Hero({ started }) {
  const root = useRef(null)
  const mountRef = useRef(null)
  const tagRef = useRef(null)
  const tagNumRef = useRef(null)
  const tagLabelRef = useRef(null)
  const scrollTo = useScrollTo()

  // ── 3D three-body scene: planets, glow, trails, starfield ──
  useEffect(() => {
    const container = mountRef.current
    // mobile / in-app webviews (e.g. WeChat) choke on full-retina fill-rate +
    // the per-pixel nebula shader + a shadow pass — so trim those on small screens
    const isMobile =
      window.matchMedia('(max-width: 760px)').matches ||
      /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.3 : 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.shadowMap.enabled = !isMobile
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x030303) // void black behind the dome

    // ── cinematic key light: one distant sun raking across the planets ──
    const sun = new THREE.DirectionalLight(0xfff2dc, 3.2)
    sun.position.set(5, 2.5, 3)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 15
    sun.shadow.camera.left = -2.5
    sun.shadow.camera.right = 2.5
    sun.shadow.camera.top = 2.5
    sun.shadow.camera.bottom = -2.5
    sun.shadow.bias = -0.0015
    sun.shadow.normalBias = 0.05
    scene.add(sun)
    scene.add(new THREE.AmbientLight(0x404858, 0.42))

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    )

    // ── deep-sky backdrop: layered stars, a milky-way band, dust nebulae ──
    const cosmos = new THREE.Group()
    scene.add(cosmos)

    const starTex = makeStarTexture()
    const tmpColor = new THREE.Color()

    // one shared custom shader for every star layer: soft additive glow
    // sprites with perspective size attenuation + GPU per-vertex twinkle
    // (a sine wave with randomized phase/speed — zero per-frame CPU work)
    const starUniforms = {
      uTime: { value: 0 },
      uTex: { value: starTex },
      uScale: { value: container.clientHeight * 0.5 * renderer.getPixelRatio() },
    }
    const starMat = new THREE.ShaderMaterial({
      uniforms: starUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aTw;
        attribute float aPhase;
        attribute float aSpeed;
        uniform float uTime;
        uniform float uScale;
        varying vec3 vColor;
        void main(){
          float tw = 1.0 + aTw * sin(uTime * aSpeed + aPhase);
          vColor = aColor * (0.62 + 0.38 * tw);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(aSize * uScale * tw / -mv.z, 1.5, 48.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uTex;
        varying vec3 vColor;
        void main(){
          float a = texture2D(uTex, gl_PointCoord).a;
          gl_FragColor = vec4(vColor, 1.0) * a;
        }`,
    })

    const makeStars = (count, { aSize, placer, twFrac }) => {
      const geo = new THREE.BufferGeometry()
      const pos = new Float32Array(count * 3)
      const col = new Float32Array(count * 3)
      const siz = new Float32Array(count)
      const twk = new Float32Array(count)
      const pha = new Float32Array(count)
      const spd = new Float32Array(count)
      for (let i = 0; i < count; i++) {
        placer(pos, i)
        tmpColor.set(STAR_COLORS[(Math.random() * STAR_COLORS.length) | 0])
        const lum = 0.5 + Math.random() * 0.5 // magnitude variation
        col[i * 3] = tmpColor.r * lum
        col[i * 3 + 1] = tmpColor.g * lum
        col[i * 3 + 2] = tmpColor.b * lum
        siz[i] = aSize * (0.6 + Math.random() * 0.9)
        twk[i] = Math.random() < twFrac ? 0.35 + Math.random() * 0.45 : 0
        pha[i] = Math.random() * Math.PI * 2
        spd[i] = 0.4 + Math.random() * 1.1
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
      geo.setAttribute('aSize', new THREE.BufferAttribute(siz, 1))
      geo.setAttribute('aTw', new THREE.BufferAttribute(twk, 1))
      geo.setAttribute('aPhase', new THREE.BufferAttribute(pha, 1))
      geo.setAttribute('aSpeed', new THREE.BufferAttribute(spd, 1))
      const points = new THREE.Points(geo, starMat)
      cosmos.add(points)
      return { points, geo }
    }

    const shellPlacer = (rMin, rSpan) => (pos, i) => {
      const r = rMin + Math.random() * rSpan
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
    }

    // stars squeezed toward a plane → the galactic band
    const bandPlacer = (pos, i) => {
      const r = 12 + Math.random() * 16
      const theta = Math.random() * Math.PI * 2
      pos[i * 3] = r * Math.cos(theta)
      pos[i * 3 + 1] = gauss() * 2.2
      pos[i * 3 + 2] = r * Math.sin(theta)
    }

    // 4,000 stars across three depth layers (far / mid-band / near)
    const farStars = makeStars(isMobile ? 900 : 2000, { aSize: 0.05, twFrac: 0.18, placer: shellPlacer(18, 16) })
    const bandStars = makeStars(isMobile ? 600 : 1300, { aSize: 0.06, twFrac: 0.26, placer: bandPlacer })
    const nearStars = makeStars(isMobile ? 320 : 700, { aSize: 0.1, twFrac: 0.42, placer: shellPlacer(7, 7) })

    // simplex-noise nebula dome behind everything
    const sky = makeSkyDome()
    scene.add(sky)

    // tilt the whole galaxy like a wide-field NASA frame
    cosmos.rotation.set(0.55, 0, 0.35)
    let scrollLerp = 0

    // tilted orbital plane gives the choreography depth
    const group = new THREE.Group()
    group.rotation.x = -0.42
    scene.add(group)

    const texLoader = new THREE.TextureLoader()
    texLoader.setCrossOrigin('anonymous')
    const loadedTextures = []
    const applyTex = (mat, slot, url, srgb) => {
      const tex = texLoader.load(
        url,
        (t) => {
          if (srgb) t.colorSpace = THREE.SRGBColorSpace
          t.anisotropy = renderer.capabilities.getMaxAnisotropy()
          mat[slot] = t
          mat.needsUpdate = true
        },
        undefined,
        () => {}
      )
      loadedTextures.push(tex)
    }

    const bodies = BODY_DEFS.map((def, i) => {
      const color = new THREE.Color(def.color)
      const s = def.surface

      const mat = new THREE.MeshStandardMaterial({
        color: s.tint,
        roughness: s.roughness,
        metalness: s.metalness,
      })
      if (s.map) applyTex(mat, 'map', TEX_BASE + s.map, true)
      if (s.normal) applyTex(mat, 'normalMap', TEX_BASE + s.normal, false)
      if (s.bump) {
        applyTex(mat, 'bumpMap', TEX_BASE + s.bump, false)
        mat.bumpScale = 0.12
      }

      const mesh = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R, 48, 48), mat)
      mesh.castShadow = true
      mesh.receiveShadow = true

      let atmo = null
      if (s.atmosphere) {
        atmo = makeAtmosphere(PLANET_R * 1.15, s.atmosphere)
        mesh.add(atmo)
      }

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.26, 0.006, 8, 48),
        new THREE.MeshBasicMaterial({
          color: def.color,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      )
      ring.rotation.x = Math.PI / 2.4
      mesh.add(ring)
      group.add(mesh)

      const tGeo = new THREE.BufferGeometry()
      tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3))
      tGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3))
      tGeo.setDrawRange(0, 0)
      const line = new THREE.Line(
        tGeo,
        new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      )
      group.add(line)

      return {
        ...def,
        ax: 0,
        ay: 0,
        phase: i * 2.1,
        hover: 0,
        spin: 0.0003 + i * 0.00018,
        color,
        mesh,
        atmo,
        ring,
        line,
        tGeo,
        history: [],
      }
    })

    const pointer = { px: -1e4, py: -1e4, nx: 0, ny: 0, inside: false }
    const onPointerMove = (e) => {
      const r = container.getBoundingClientRect()
      pointer.px = e.clientX - r.left
      pointer.py = e.clientY - r.top
      pointer.nx = (pointer.px / r.width) * 2 - 1
      pointer.ny = (pointer.py / r.height) * 2 - 1
      pointer.inside = true
    }
    const onPointerLeave = () => {
      pointer.inside = false
      pointer.px = -1e4
    }
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerleave', onPointerLeave)

    const para = { x: 0, y: 0 }
    const tmpVec = new THREE.Vector3()
    let lastActive = -1
    const dirItems = root.current.querySelectorAll('.dir-item')
    const tagEl = tagRef.current

    const onClick = () => {
      if (lastActive >= 0) scrollTo(SECTIONS[lastActive].href)
    }
    container.addEventListener('click', onClick)

    const step = () => {
      bodies.forEach((b) => {
        b.ax = 0
        b.ay = 0
      })
      for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 3; j++) {
          const a = bodies[i]
          const b = bodies[j]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const d2 = dx * dx + dy * dy + EPS2
          const inv = 1 / (Math.sqrt(d2) * d2)
          a.ax += dx * inv
          a.ay += dy * inv
          b.ax -= dx * inv
          b.ay -= dy * inv
        }
      }
      bodies.forEach((b) => {
        b.vx += b.ax * DT
        b.vy += b.ay * DT
        b.x += b.vx * DT
        b.y += b.vy * DT
      })
    }

    let elapsed = 0
    const render = () => {
      elapsed += 0.016
      for (let s = 0; s < SUBSTEPS; s++) step()

      bodies.forEach((b) => {
        const z = Math.sin(elapsed * 0.13 + b.phase) * 0.12
        b.mesh.position.set(b.x, b.y, z)
        b.history.push(b.x, b.y, z)
        if (b.history.length > TRAIL * 3) b.history.splice(0, b.history.length - TRAIL * 3)
        const n = b.history.length / 3
        const pos = b.tGeo.attributes.position.array
        const col = b.tGeo.attributes.color.array
        for (let i = 0; i < n; i++) {
          pos[i * 3] = b.history[i * 3]
          pos[i * 3 + 1] = b.history[i * 3 + 1]
          pos[i * 3 + 2] = b.history[i * 3 + 2]
          const f = Math.pow(i / n, 1.6)
          col[i * 3] = b.color.r * f
          col[i * 3 + 1] = b.color.g * f
          col[i * 3 + 2] = b.color.b * f
        }
        b.tGeo.setDrawRange(0, n)
        b.tGeo.attributes.position.needsUpdate = true
        b.tGeo.attributes.color.needsUpdate = true
      })

      para.x += ((pointer.inside ? pointer.nx * 0.3 : 0) - para.x) * 0.018
      para.y += ((pointer.inside ? pointer.ny * 0.2 : 0) - para.y) * 0.018
      const t = elapsed * 0.021
      camera.position.set(
        Math.sin(t) * 2.35 + para.x,
        0.7 + Math.sin(elapsed * 0.013) * 0.25 - para.y,
        Math.cos(t) * 2.35
      )
      camera.lookAt(0, 0, 0)
      camera.updateMatrixWorld()

      const cw = container.clientWidth
      const ch = container.clientHeight
      let activeIdx = -1
      let activeX = 0
      let activeY = 0
      bodies.forEach((b, i) => {
        b.mesh.getWorldPosition(tmpVec)
        tmpVec.project(camera)
        const sx = (tmpVec.x * 0.5 + 0.5) * cw
        const sy = (-tmpVec.y * 0.5 + 0.5) * ch
        const hovered = pointer.inside && Math.hypot(sx - pointer.px, sy - pointer.py) < 70
        if (hovered) {
          activeIdx = i
          activeX = sx
          activeY = sy
        }
        b.hover += ((hovered ? 1 : 0) - b.hover) * 0.03
        b.mesh.rotation.y += b.spin + b.hover * 0.003
        b.mesh.scale.setScalar(1 + b.hover * 0.9)
        b.ring.material.opacity = b.hover * 0.85
        b.ring.rotation.y += 0.005 + b.hover * 0.016
        b.ring.rotation.z += 0.002 + b.hover * 0.007
        b.line.material.opacity = 0.7 + b.hover * 0.3
      })

      if (activeIdx !== lastActive) {
        container.style.cursor = activeIdx >= 0 ? 'pointer' : ''
        dirItems.forEach((el, i) => el.classList.toggle('is-active', i === activeIdx))
        if (activeIdx >= 0) {
          const s = SECTIONS[activeIdx]
          tagNumRef.current.textContent = s.num
          tagLabelRef.current.textContent = `${s.label} · ${s.zh}`
          tagEl.style.setProperty('--tag-hue', s.hue)
          gsap.to(tagEl, { autoAlpha: 1, duration: 0.7, ease: 'power2.out', overwrite: 'auto' })
        } else {
          gsap.to(tagEl, { autoAlpha: 0, duration: 0.9, ease: 'power2.out', overwrite: 'auto' })
        }
        lastActive = activeIdx
      }
      if (activeIdx >= 0) {
        tagEl.style.transform = `translate(${activeX + 28}px, ${activeY - 40}px)`
      }

      cosmos.rotation.y += 0.00006
      sky.material.uniforms.uTime.value = elapsed
      starUniforms.uTime.value = elapsed
      scrollLerp += (window.scrollY - scrollLerp) * 0.05
      const sN = scrollLerp * 0.00016
      farStars.points.rotation.set(para.y * 0.008 + sN * 0.3, para.x * 0.012, 0)
      bandStars.points.rotation.set(para.y * 0.022 + sN * 0.6, para.x * 0.035, 0)
      nearStars.points.rotation.set(para.y * 0.05 + sN * 1.0, para.x * 0.08, 0)

      renderer.render(scene, camera)
    }

    const resize = () => {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
      starUniforms.uScale.value = container.clientHeight * 0.5 * renderer.getPixelRatio()
    }
    window.addEventListener('resize', resize)

    let inView = true
    const st = ScrollTrigger.create({
      trigger: container,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => (inView = self.isActive),
    })

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const tick = () => {
      if (inView) render()
    }

    if (reduced) {
      for (let s = 0; s < 400; s++) step()
      render()
    } else {
      gsap.ticker.add(tick)
    }

    return () => {
      gsap.ticker.remove(tick)
      window.removeEventListener('resize', resize)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerleave', onPointerLeave)
      container.removeEventListener('click', onClick)
      st.kill()
      bodies.forEach((b) => {
        b.mesh.geometry.dispose()
        b.mesh.material.dispose()
        b.ring.geometry.dispose()
        b.ring.material.dispose()
        if (b.atmo) {
          b.atmo.geometry.dispose()
          b.atmo.material.dispose()
        }
        b.line.material.dispose()
        b.tGeo.dispose()
      })
      loadedTextures.forEach((t) => t.dispose())
      ;[farStars, nearStars, bandStars].forEach((s) => s.geo.dispose())
      starMat.dispose()
      sky.geometry.dispose()
      sky.material.dispose()
      starTex.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  // ── entrance after the preloader lifts ──
  useGSAP(
    (context, contextSafe) => {
      if (!started) return

      const play = contextSafe(() => {
        const title = new SplitText('.hero-line', { type: 'chars' })

        // lands near the logo position but eased away from the corner
        const logoDelta = (axis) => () => {
          const logo = document.querySelector('.nav-logo').getBoundingClientRect()
          const base = document.querySelector('.hero-center').getBoundingClientRect()
          return `+=${axis === 'x' ? logo.left - base.left + 28 : logo.top - base.top + 26}`
        }

        gsap
          .timeline({ defaults: { ease: 'power4.out' } })
          .set(root.current, { autoAlpha: 1 })
          .from('.hero-canvas', { autoAlpha: 0, duration: 1.1, ease: 'power2.out' }, 0)
          .from(title.chars, { yPercent: 115, duration: 1, stagger: 0.035 }, 0.15)
          .from('.dir-item', { autoAlpha: 0, y: 28, duration: 0.62, stagger: 0.055 }, '-=0.5')
          // the name plate shrinks into the top-left corner and stays
          // there as a faint watermark
          .to(
            '.hero-center',
            {
              x: logoDelta('x'),
              y: logoDelta('y'),
              scale: 0.12,
              transformOrigin: 'left top',
              autoAlpha: 0.3,
              duration: 0.9,
              ease: 'power4.inOut',
            },
            '+=0.5'
          )
      })

      document.fonts.ready.then(play)
    },
    { scope: root, dependencies: [started] }
  )

  const [firstName, ...rest] = resume.name.split(' ')

  return (
    <section className="hero" id="top" ref={root}>
      <div className="hero-canvas" ref={mountRef} aria-hidden="true" />

      <div className="planet-tag" ref={tagRef} aria-hidden="true">
        <span className="planet-tag-num" ref={tagNumRef} />
        <span className="planet-tag-label" ref={tagLabelRef} />
      </div>

      <div className="hero-center">
        <h1 className="hero-base">
          <span className="hero-line">
            {firstName} <span className="hero-line-alt">{rest.join(' ')}</span>{' '}
            <span className="hero-zh">{resume.chineseName}</span>
          </span>
        </h1>
      </div>

      <nav className="hero-directory" aria-label="Site directory">
        {SECTIONS.map((s) => (
          <a
            key={s.num}
            className="dir-item"
            href={s.href}
            onClick={(e) => {
              e.preventDefault()
              scrollTo(s.href)
            }}
          >
            <span className="dir-num">
              <span className="dir-dot" style={{ background: s.hue }} />
              {s.num}
            </span>
            <span className="dir-label">
              {s.label}
              <span className="dir-arrow">↘</span>
            </span>
            <span className="dir-zh">{s.zh}</span>
          </a>
        ))}
      </nav>
    </section>
  )
}
