import { useRef } from 'react'
import gsap from 'gsap'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { useGSAP } from '@gsap/react'
import { resume } from '../data/resume.js'

gsap.registerPlugin(ScrambleTextPlugin)

// Seconds each chapter slide owns; the % counter spans the whole sequence,
// so loading and the slide show finish together.
const STEP = 0.8
const SEGMENTS = 28

// HUD status line per chapter, matched to each word's meaning
const STATUSES = [
  'SCANNING MARKET SIGNALS',
  'COMPUTING GAME PLAN',
  'IGNITING IMAGINATION',
  'EXECUTING FLIGHT PLAN',
]

export default function Preloader({ onReveal }) {
  const root = useRef(null)
  const countRef = useRef(null)
  const barRef = useRef(null)
  const statusRef = useRef(null)
  const segRef = useRef(null)

  useGSAP(
    () => {
      const slides = gsap.utils.toArray('.pre-slide')
      const total = STEP * slides.length
      const counter = { v: 0 }
      const segs = segRef.current.children

      gsap.set(slides.slice(1), { clipPath: 'inset(100% 0% 0% 0%)' })

      const setStatus = (i) =>
        gsap.to(statusRef.current, {
          duration: 0.7,
          scrambleText: { text: STATUSES[i], chars: '01<>/#_', speed: 0.5 },
        })

      const tl = gsap.timeline()

      // lightweight per-frame update — segments only re-toggle when the
      // filled count actually changes (avoids 28 DOM writes every frame)
      let lastN = -1
      let lastFilled = -1
      tl.to(
        counter,
        {
          v: 100,
          duration: total,
          ease: 'power1.inOut',
          onUpdate: () => {
            const n = Math.round(counter.v)
            if (n === lastN) return
            lastN = n
            countRef.current.textContent = String(n).padStart(3, '0')
            barRef.current.style.transform = `scaleX(${n / 100})`
            const filled = Math.round((n / 100) * SEGMENTS)
            if (filled !== lastFilled) {
              for (let i = 0; i < SEGMENTS; i++) segs[i].classList.toggle('on', i < filled)
              lastFilled = filled
            }
          },
        },
        0
      )
        .call(() => setStatus(0), [], 0.05)
        .from(
          slides[0].querySelector('.pre-word'),
          { yPercent: 60, autoAlpha: 0, duration: 0.62, ease: 'power3.out' },
          0.05
        )

      slides.slice(1).forEach((slide, i) => {
        const at = STEP * (i + 1)
        tl.to(slide, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.58, ease: 'power4.inOut' }, at)
          .from(
            slide.querySelector('.pre-word'),
            { yPercent: 45, duration: 0.58, ease: 'power4.out' },
            at + 0.1
          )
          .call(() => setStatus(i + 1), [], at + 0.15)
      })

      // ── shuttle transition: fly forward through a dilating pupil ──
      // a radial mask opens a growing hole from centre (the pupil dilating)
      // to reveal the hero behind, as the content rushes toward the centre
      const iris = { v: -12 }

      tl.call(onReveal, [], total + 0.1)
        // forward rush — content accelerates toward the centre
        .to('.pre-ui', { scale: 1.18, autoAlpha: 0, duration: 1, ease: 'power2.in' }, total + 0.15)
        .to('.pre-slide .pre-word', { scale: 1.35, duration: 1, ease: 'power2.in' }, total + 0.15)
        // the pupil dilates — hero revealed through the expanding hole
        .to(
          iris,
          {
            v: 158,
            duration: 1.05,
            ease: 'power2.inOut',
            onUpdate: () => root.current.style.setProperty('--iris', iris.v + '%'),
          },
          total + 0.15
        )
        .set(root.current, { display: 'none' })
    },
    { scope: root }
  )

  const totalLabel = String(resume.chapters.length).padStart(2, '0')

  return (
    <div className="preloader" ref={root}>
      {resume.chapters.map((c, i) => (
        <div className={`pre-slide pre-slide-${i + 1}`} key={c.en} style={{ zIndex: i + 1 }}>
          <div className="pre-visual" aria-hidden="true" />
          <span className="pre-index">
            {String(i + 1).padStart(2, '0')} / {totalLabel}
          </span>
          <div className="pre-mask">
            <h2 className="pre-word">{c.en}</h2>
          </div>
          <span className="pre-zh">{c.zh}</span>
        </div>
      ))}
      <div className="pre-ui">
        <span className="pre-brand">
          {resume.chineseName} · {resume.name}
        </span>
        <div className="hud">
          <div className="hud-readout">
            <span className="preloader-count" ref={countRef}>
              000
            </span>
            <span className="hud-unit">
              %<em>/ 100</em>
            </span>
          </div>
          <div className="hud-status" ref={statusRef}>
            INITIALIZING
          </div>
          <div className="hud-segments" ref={segRef}>
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <span key={i} />
            ))}
          </div>
        </div>
        <div className="preloader-bar">
          <span ref={barRef} />
        </div>
      </div>
    </div>
  )
}
