import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'

// Two gilded tarot cards floating in the void — The Magician and The World.
// Always-on micro-float + cursor parallax, then a scroll-driven two-act
// story: the Magician ignites, then recedes as the World takes centre.

// equirectangular studio light-stage → PMREM environment (gold reflections)
function studioEnv(renderer) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 512
  const g = c.getContext('2d')
  g.fillStyle = '#040303'
  g.fillRect(0, 0, 1024, 512)
  const blob = (x, y, r, col, a) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, `rgba(${col},${a})`)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 1024, 512)
  }
  blob(300, 150, 240, '255,240,214', 0.95) // warm key
  blob(740, 300, 300, '255,168,86', 0.55) // amber fill
  blob(880, 120, 170, '150,180,255', 0.4) // cool rim
  blob(520, 480, 420, '120,68,38', 0.35) // ground bounce

  const tex = new THREE.CanvasTexture(c)
  tex.mapping = THREE.EquirectangularReflectionMapping
  tex.colorSpace = THREE.SRGBColorSpace
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromEquirectangular(tex).texture
  tex.dispose()
  pmrem.dispose()
  return env
}

// ── procedural tarot card faces (original minimalist line-art) ──
const CARD_W = 512
const CARD_H = 896

function drawCard(type, mode) {
  const c = document.createElement('canvas')
  c.width = CARD_W
  c.height = CARD_H
  const g = c.getContext('2d')
  const cx = CARD_W / 2

  const ink = mode === 'bump' ? '#383838' : '#6b5524'
  const faint = mode === 'bump' ? '#5c5c5c' : 'rgba(107,85,36,0.5)'

  if (mode === 'bump') {
    g.fillStyle = '#7c7c7c'
    g.fillRect(0, 0, CARD_W, CARD_H)
  } else {
    const grad = g.createLinearGradient(0, 0, 0, CARD_H)
    grad.addColorStop(0, '#efe7d4')
    grad.addColorStop(1, '#e3d8bf')
    g.fillStyle = grad
    g.fillRect(0, 0, CARD_W, CARD_H)
  }

  g.strokeStyle = ink
  g.fillStyle = ink
  g.lineJoin = 'round'
  g.lineCap = 'round'

  g.lineWidth = 4
  g.strokeRect(34, 34, CARD_W - 68, CARD_H - 68)
  g.lineWidth = 2
  g.strokeRect(50, 50, CARD_W - 100, CARD_H - 100)

  g.textAlign = 'center'
  g.font = '600 30px "Cormorant Garamond", Georgia, serif'
  g.fillText(type === 'magician' ? 'THE MAGICIAN' : 'THE WORLD', cx, 108)
  g.font = '500 26px "Cormorant Garamond", Georgia, serif'
  g.fillText(type === 'magician' ? 'I' : 'XXI', cx, CARD_H - 86)

  if (type === 'magician') {
    g.lineWidth = 3
    g.beginPath()
    g.ellipse(cx - 20, 210, 20, 12, 0, 0, Math.PI * 2)
    g.ellipse(cx + 20, 210, 20, 12, 0, 0, Math.PI * 2)
    g.stroke()

    g.lineWidth = 4
    g.beginPath()
    g.arc(cx, 280, 26, 0, Math.PI * 2)
    g.moveTo(cx, 306)
    g.lineTo(cx, 470)
    g.moveTo(cx, 350)
    g.lineTo(cx - 70, 300)
    g.moveTo(cx, 360)
    g.lineTo(cx + 60, 430)
    g.moveTo(cx, 470)
    g.lineTo(cx - 40, 560)
    g.moveTo(cx, 470)
    g.lineTo(cx + 40, 560)
    g.stroke()

    g.lineWidth = 2
    const lx = cx - 70
    const ly = 300
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      g.beginPath()
      g.moveTo(lx, ly)
      g.lineTo(lx + Math.cos(a) * 34, ly + Math.sin(a) * 34)
      g.stroke()
    }
    g.beginPath()
    g.arc(lx, ly, 9, 0, Math.PI * 2)
    g.fill()

    g.lineWidth = 3
    g.strokeRect(cx - 90, 600, 180, 18)
    g.strokeStyle = faint
    g.lineWidth = 2
    ;[cx - 60, cx - 20, cx + 20, cx + 60].forEach((mx) => {
      g.beginPath()
      g.arc(mx, 660, 12, 0, Math.PI * 2)
      g.stroke()
    })
  } else {
    const rx = 150
    const ry = 230
    g.lineWidth = 3
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2
      const px = cx + Math.cos(a) * rx
      const py = 448 + Math.sin(a) * ry
      g.beginPath()
      g.ellipse(px, py, 16, 6, a + Math.PI / 2, 0, Math.PI * 2)
      g.stroke()
    }
    g.lineWidth = 4
    g.beginPath()
    g.arc(cx, 360, 22, 0, Math.PI * 2)
    g.moveTo(cx, 382)
    g.lineTo(cx, 500)
    g.moveTo(cx, 410)
    g.lineTo(cx - 55, 380)
    g.moveTo(cx, 415)
    g.lineTo(cx + 55, 450)
    g.moveTo(cx, 500)
    g.lineTo(cx - 45, 590)
    g.moveTo(cx, 500)
    g.lineTo(cx + 30, 600)
    g.stroke()

    g.strokeStyle = faint
    g.lineWidth = 2
    ;[
      [110, 200],
      [CARD_W - 110, 200],
      [110, CARD_H - 200],
      [CARD_W - 110, CARD_H - 200],
    ].forEach(([gx, gy]) => {
      g.beginPath()
      g.arc(gx, gy, 16, 0, Math.PI * 2)
      g.stroke()
    })
  }

  const tex = new THREE.CanvasTexture(c)
  if (mode !== 'bump') tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

export default function ChromeStage() {
  const mountRef = useRef(null)

  useEffect(() => {
    const container = mountRef.current
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const env = studioEnv(renderer)
    scene.environment = env

    const camera = new THREE.PerspectiveCamera(
      40,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    )
    camera.position.set(0, 0, 4.6)

    // parallax group — the whole pair tilts toward the cursor
    const stage = new THREE.Group()
    scene.add(stage)

    scene.add(new THREE.AmbientLight(0x4a4038, 0.5))
    const key = new THREE.DirectionalLight(0xffe9cf, 1.2)
    key.position.set(2.5, 2, 4)
    scene.add(key)

    const cardGeo = new THREE.BoxGeometry(1.4, 2.45, 0.06)
    const disposables = []

    const makeCard = (type) => {
      const map = drawCard(type, 'art')
      const bump = drawCard(type, 'bump')
      disposables.push(map, bump)
      const gold = new THREE.MeshPhysicalMaterial({
        color: 0x6b5326,
        metalness: 0.9,
        roughness: 0.15,
        envMap: env,
        envMapIntensity: 1.0,
        transparent: true,
      })
      const face = new THREE.MeshPhysicalMaterial({
        color: 0xece2cf,
        map,
        bumpMap: bump,
        bumpScale: 0.05,
        metalness: 0,
        roughness: 0.5,
        transmission: 0.1,
        thickness: 0.5,
        ior: 1.45,
        envMap: env,
        envMapIntensity: 0.55,
        clearcoat: 0.18,
        clearcoatRoughness: 0.5,
        transparent: true,
      })
      disposables.push(gold, face)
      // px, nx, py, ny, pz(front face), nz(back)
      const mesh = new THREE.Mesh(cardGeo, [gold, gold, gold, gold, face, gold])
      mesh.userData.mats = [gold, face]
      stage.add(mesh)
      return mesh
    }

    const magician = makeCard('magician')
    const world = makeCard('world')

    // scroll-driven state (set by the GSAP timeline); the render loop
    // composes these with the always-on float + parallax
    magician.userData.s = { x: 0, y: 0, z: 0.3, ry: Math.PI, scale: 1, op: 1, ph: 0 }
    world.userData.s = { x: 1.85, y: 0.18, z: -0.9, ry: -0.55, scale: 0.78, op: 1, ph: 2.1 }
    const acts = { ignite: 0, w2: 0 }

    // ── ignition: point light + amber spark particles at the wand ──
    const WAND = new THREE.Vector3(-0.19, 0.46, 0.12)
    const wandLight = new THREE.PointLight(0xffb45a, 0, 4, 2)
    wandLight.position.copy(WAND)
    magician.add(wandLight)

    const SPARKS = 70
    const sparkGeo = new THREE.BufferGeometry()
    const sPos = new Float32Array(SPARKS * 3)
    const sVel = []
    const resetSpark = (i) => {
      sPos[i * 3] = WAND.x + (Math.random() - 0.5) * 0.25
      sPos[i * 3 + 1] = WAND.y + (Math.random() - 0.5) * 0.1
      sPos[i * 3 + 2] = WAND.z + (Math.random() - 0.5) * 0.2
      sVel[i] = { x: (Math.random() - 0.5) * 0.004, y: 0.006 + Math.random() * 0.01 }
    }
    for (let i = 0; i < SPARKS; i++) resetSpark(i)
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3))
    const sparkTex = (() => {
      const c = document.createElement('canvas')
      c.width = c.height = 64
      const g = c.getContext('2d')
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
      grd.addColorStop(0, 'rgba(255,230,170,1)')
      grd.addColorStop(1, 'rgba(255,180,90,0)')
      g.fillStyle = grd
      g.fillRect(0, 0, 64, 64)
      return new THREE.CanvasTexture(c)
    })()
    const sparkMat = new THREE.PointsMaterial({
      size: 0.09,
      map: sparkTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const sparks = new THREE.Points(sparkGeo, sparkMat)
    magician.add(sparks)
    disposables.push(sparkGeo, sparkMat, sparkTex)

    // ── pointer parallax (firefly cursor) with heavy damping ──
    const ptr = { tx: 0, ty: 0, x: 0, y: 0 }
    const onMove = (e) => {
      ptr.tx = (e.clientX / window.innerWidth) * 2 - 1
      ptr.ty = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)

    // ── two-act scroll choreography ──
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '#about', start: 'top top', end: 'bottom bottom', scrub: 0.8 },
    })
    // Act 1 — the Magician flips to its face and ignites
    tl.to(magician.userData.s, { ry: 0, duration: 1, ease: 'power2.inOut' }, 0)
      .to(acts, { ignite: 1, duration: 0.8 }, 0.3)
    // Act 2 — Magician recedes & fades, the World takes centre
    tl.to(acts, { ignite: 0, duration: 0.5 }, 1.7)
      .to(
        magician.userData.s,
        { x: -0.7, y: -0.25, z: -2, scale: 0.66, op: 0, duration: 1, ease: 'power2.in' },
        1.7
      )
      .to(
        world.userData.s,
        { x: 0, y: 0, z: 0.35, ry: 0, scale: 1, duration: 1.1, ease: 'power2.out' },
        1.8
      )
      .to(acts, { w2: 1, duration: 1 }, 1.8)

    let inView = true
    const stt = ScrollTrigger.create({
      trigger: container,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => (inView = self.isActive),
    })

    const apply = (card, t) => {
      const s = card.userData.s
      const floatY = Math.sin(t * 0.6 + s.ph) * 0.06
      const floatX = Math.cos(t * 0.45 + s.ph) * 0.03
      card.position.set(s.x + floatX, s.y + floatY, s.z)
      card.scale.setScalar(s.scale)
      card.userData.mats.forEach((m) => (m.opacity = s.op))
    }

    let t = 0
    const render = () => {
      t += 0.016
      ptr.x += (ptr.tx - ptr.x) * 0.05
      ptr.y += (ptr.ty - ptr.y) * 0.05

      stage.rotation.y = ptr.x * 0.22
      stage.rotation.x = ptr.y * 0.16

      apply(magician, t)
      apply(world, t)
      // base flip + ambient sway
      magician.rotation.y = magician.userData.s.ry
      magician.rotation.x = Math.sin(t * 0.5) * 0.04
      // the World's laurel turns as it arrives at centre
      world.rotation.y = world.userData.s.ry
      world.rotation.z = t * 0.18 * acts.w2 + Math.sin(t * 0.4 + 1) * 0.02

      wandLight.intensity = acts.ignite * 6
      sparkMat.opacity = acts.ignite
      if (acts.ignite > 0.01) {
        for (let i = 0; i < SPARKS; i++) {
          sPos[i * 3] += sVel[i].x
          sPos[i * 3 + 1] += sVel[i].y
          if (sPos[i * 3 + 1] > WAND.y + 0.9) resetSpark(i)
        }
        sparkGeo.attributes.position.needsUpdate = true
      }

      renderer.render(scene, camera)
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const tick = () => {
      if (inView) render()
    }
    if (reduced) render()
    else gsap.ticker.add(tick)

    const resize = () => {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', resize)

    return () => {
      gsap.ticker.remove(tick)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', resize)
      stt.kill()
      tl.scrollTrigger?.kill()
      tl.kill()
      cardGeo.dispose()
      disposables.forEach((d) => d.dispose())
      env.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  return <div className="chrome-canvas" ref={mountRef} aria-hidden="true" />
}
