import { useRef, useState } from 'react'
import gsap from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { useGSAP } from '@gsap/react'
import { resume } from '../data/resume.js'
import SectionHeader from './SectionHeader.jsx'
import MoreWork from './MoreWork.jsx'

gsap.registerPlugin(Draggable)

// clean diagonal "open link" arrow (replaces the bare ↗ glyph)
const ArrowOut = () => (
  <svg className="arr-ico" width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
    <path
      d="M3 8L8 3M8 3H3.6M8 3V7.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const TOTAL_SLOTS = 12

// real cases first, the rest reserved for future work
const slots = [
  ...resume.projects,
  ...Array.from({ length: TOTAL_SLOTS - resume.projects.length }, (_, i) => ({
    placeholder: true,
    title: '案例席位 · Reserved',
    category: 'Coming Soon',
    year: `0${i + 1}`.slice(-2),
  })),
]

export default function Work() {
  const root = useRef(null)
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const progressRef = useRef(null)
  const [index, setIndex] = useState(0)
  const count = slots.length

  // directional clip-path reveal on the case images as the slider enters
  useGSAP(
    () => {
      gsap.fromTo(
        '.work-visual',
        { clipPath: 'inset(0 100% 0 0)' },
        {
          clipPath: 'inset(0 0% 0 0)',
          duration: 1.1,
          ease: 'power4.out',
          stagger: 0.12,
          scrollTrigger: { trigger: viewportRef.current, start: 'top 80%', once: true },
        }
      )
      gsap.fromTo(
        '.work-visual-img',
        { scale: 1.25 },
        {
          scale: 1,
          duration: 1.4,
          ease: 'power3.out',
          stagger: 0.12,
          scrollTrigger: { trigger: viewportRef.current, start: 'top 80%', once: true },
        }
      )
    },
    { scope: root }
  )

  const maxShift = () => {
    const track = trackRef.current
    const viewport = viewportRef.current
    return Math.max(track.scrollWidth - viewport.clientWidth, 0)
  }

  const fracOf = (i) => (count > 1 ? i / (count - 1) : 0)

  // arrow / programmatic move — eased settle to a card
  const goTo = (i) => {
    const c = Math.min(Math.max(i, 0), count - 1)
    setIndex(c)
    gsap.to(trackRef.current, { x: -fracOf(c) * maxShift(), duration: 2.6, ease: 'power3.out' })
    gsap.to(progressRef.current, { scaleX: fracOf(c), duration: 2.6, ease: 'power3.out' })
  }

  // both interactions at once: drag the strip directly, OR glide it by
  // moving the cursor across the viewport — each settling onto a card
  useGSAP(
    () => {
      const track = trackRef.current
      let dragging = false
      let lastIdx = 0

      const xTo = gsap.quickTo(track, 'x', { duration: 4.8, ease: 'power3.out' })
      const pTo = gsap.quickTo(progressRef.current, 'scaleX', { duration: 4.8, ease: 'power3.out' })

      // hover-glide (skipped on touch) — RELATIVE to where the cursor
      // enters, so the first move never teleports across many cards; one
      // full-width sweep ≈ a few cards, not the whole strip
      const hoverable = !window.matchMedia('(hover: none)').matches
      const SWEEP = 6 // cards traversed per full-viewport-width sweep
      let originX = null
      let originIdx = 0
      const onEnter = (e) => {
        originX = e.clientX
        originIdx = lastIdx
      }
      const onLeave = () => {
        originX = null
      }
      const onMove = (e) => {
        if (dragging) return
        const r = viewportRef.current.getBoundingClientRect()
        if (originX === null) {
          originX = e.clientX
          originIdx = lastIdx
        }
        const delta = ((e.clientX - originX) / r.width) * SWEEP
        const i = gsap.utils.clamp(0, count - 1, Math.round(originIdx + delta))
        if (i === lastIdx) return
        lastIdx = i
        xTo(-fracOf(i) * maxShift())
        pTo(fracOf(i))
        setIndex(i)
      }
      if (hoverable) {
        const vp = viewportRef.current
        vp.addEventListener('pointerenter', onEnter)
        vp.addEventListener('pointerleave', onLeave)
        vp.addEventListener('pointermove', onMove)
      }

      // drag the strip directly
      const [drag] = Draggable.create(track, {
        type: 'x',
        inertia: false,
        cursor: 'grab',
        activeCursor: 'grabbing',
        allowContextMenu: true,
        dragResistance: 0.18, // softer trackpad drags — no sudden over-shoot
        bounds: { minX: -maxShift(), maxX: 0 },
        onPress() {
          dragging = true
          gsap.killTweensOf(track)
          this.update() // sync Draggable to the strip's current x (no jump)
        },
        onDrag() {
          const frac = maxShift() ? -this.x / maxShift() : 0
          gsap.set(progressRef.current, { scaleX: frac })
          const i = Math.round(frac * (count - 1))
          if (i !== lastIdx) {
            lastIdx = i
            setIndex(i)
          }
        },
        onRelease() {
          const frac = maxShift() ? -this.x / maxShift() : 0
          const i = gsap.utils.clamp(0, count - 1, Math.round(frac * (count - 1)))
          dragging = false
          lastIdx = i
          goTo(i)
        },
      })

      return () => {
        if (hoverable) {
          const vp = viewportRef.current
          vp.removeEventListener('pointerenter', onEnter)
          vp.removeEventListener('pointerleave', onLeave)
          vp.removeEventListener('pointermove', onMove)
        }
        drag.kill()
      }
    },
    { scope: root }
  )

  return (
    <section className="section work" id="work" ref={root}>
      <SectionHeader index="04" title="Selected Work" />
      <div className="work-controls" data-reveal>
        <span className="work-counter">
          {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
        </span>
        <div className="work-progress" aria-hidden="true">
          <span className="work-progress-fill" ref={progressRef} />
        </div>
        <div className="work-foot">
          <span className="work-hint">拖动或移动鼠标滑览</span>
          <div className="work-arrows">
            <button
              className="work-arrow"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              aria-label="Previous"
            >
              ←
            </button>
            <button
              className="work-arrow"
              onClick={() => goTo(index + 1)}
              disabled={index === count - 1}
              aria-label="Next"
            >
              →
            </button>
          </div>
        </div>
      </div>
      <div className="work-stage" data-reveal>
        <div className="work-viewport" ref={viewportRef}>
          <div className="work-track" ref={trackRef}>
          {slots.map((p, i) => (
            <article
              className={`work-card${p.placeholder ? ' is-reserved' : ''}`}
              key={`${p.title}-${i}`}
            >
              <div className={`work-visual work-visual-${(i % 6) + 1}`}>
                {p.image && (
                  <>
                    <img className="work-visual-img" src={p.image} alt={p.title} loading="lazy" />
                    <div className="work-visual-scrim" aria-hidden="true" />
                  </>
                )}
                <span className="work-card-num">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="work-card-body">
                <h3 className="work-card-title">{p.title}</h3>
                <p className="work-card-meta">
                  {p.category} — {p.year}
                  {p.link?.startsWith('http') && (
                    <a className="case-link" href={p.link} target="_blank" rel="noreferrer">
                      数英案例页 <ArrowOut />
                    </a>
                  )}
                </p>
                {p.description && <p className="work-card-desc">{p.description}</p>}
                {p.channels?.length > 0 && (
                  <div className="channel-row">
                    {p.channels.map((ch) => (
                      <a
                        className="channel-chip"
                        href={ch.url}
                        target="_blank"
                        rel="noreferrer"
                        key={ch.label}
                      >
                        {ch.label} <ArrowOut />
                      </a>
                    ))}
                  </div>
                )}
                {p.awards?.length > 0 && (
                  <div className="award-row">
                    {p.awards.map((a) =>
                      a.url ? (
                        <a
                          className="award-chip is-link"
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          key={a.label}
                        >
                          🏆 {a.label} <ArrowOut />
                        </a>
                      ) : (
                        <span className="award-chip" key={a.label}>
                          🏆 {a.label}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
          </div>
        </div>
      </div>
      <MoreWork />
    </section>
  )
}
