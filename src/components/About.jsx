import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { resume } from '../data/resume.js'

// Seamless looping video background. Plays only a slice of the clip
// (range = [startFraction, endFraction]) at 0.8× speed, and hides the loop
// seam by crossfading two offset copies — so the wrap-around is invisible.
// No ffmpeg needed; everything is done in the browser. Plays on scroll-in.
const BASE_OPACITY = 0.26
const RATE = 0.8
const FADE = 0.7 // seconds of crossfade at the seam

function VideoBg({ src, range }) {
  const aRef = useRef(null)
  const bRef = useRef(null)
  useEffect(() => {
    const a = aRef.current
    const b = bRef.current
    const vids = [a, b]
    let start = 0
    let end = Infinity
    let ready = false
    let active = 0
    let visible = false
    let raf = 0

    vids.forEach((v) => {
      v.muted = true
      v.playbackRate = RATE
    })

    const onMeta = () => {
      start = a.duration * range[0]
      end = a.duration * range[1]
      ready = true
      a.currentTime = start
      b.currentTime = start
      a.style.opacity = BASE_OPACITY
      b.style.opacity = 0
      a.playbackRate = RATE
      b.playbackRate = RATE
    }
    a.addEventListener('loadedmetadata', onMeta)

    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (!ready || !visible) return
      const cur = vids[active]
      const other = vids[1 - active]
      const t = cur.currentTime
      if (t >= end - FADE) {
        if (other.paused) {
          other.currentTime = start
          other.playbackRate = RATE
          other.play().catch(() => {})
        }
        const f = Math.min((t - (end - FADE)) / FADE, 1)
        cur.style.opacity = BASE_OPACITY * (1 - f)
        other.style.opacity = BASE_OPACITY * f
        if (t >= end - 0.03) {
          cur.pause()
          cur.currentTime = start
          cur.style.opacity = 0
          other.style.opacity = BASE_OPACITY
          active = 1 - active
        }
      } else {
        cur.style.opacity = BASE_OPACITY
      }
    }

    // start when the zone scrolls into view, pause when it leaves
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting
        if (visible) vids[active].play().catch(() => {})
        else vids.forEach((v) => v.pause())
      },
      { threshold: 0.12 }
    )
    io.observe(a)
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      a.removeEventListener('loadedmetadata', onMeta)
      io.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <>
      <video ref={aRef} className="pf-video" src={src} muted playsInline preload="auto" aria-hidden="true" />
      <video ref={bRef} className="pf-video" src={src} muted playsInline preload="auto" aria-hidden="true" />
    </>
  )
}

export default function About() {
  const root = useRef(null)
  const p = resume.profile

  useGSAP(
    () => {
      const st = (trigger, start = 'top 82%') => ({ trigger, start })

      // kicker words stagger up from their masks
      gsap.from('.pf-kick', {
        yPercent: 130,
        duration: 1,
        ease: 'expo.out',
        stagger: 0.08,
        scrollTrigger: st('.pf-kicker'),
      })

      // display name unmasks bottom→top, the latin slides in after
      gsap.from('.pf-zh', {
        yPercent: 115,
        duration: 1.3,
        ease: 'expo.out',
        scrollTrigger: st('.pf-hero'),
      })
      gsap.from('.pf-en', {
        xPercent: -8,
        autoAlpha: 0,
        duration: 1.2,
        ease: 'power3.out',
        delay: 0.25,
        scrollTrigger: st('.pf-hero'),
      })

      // lead + body paragraphs focus in, offset stagger
      gsap.from('.pf-lead', {
        y: 40,
        filter: 'blur(16px)',
        autoAlpha: 0,
        duration: 1.4,
        ease: 'expo.out',
        scrollTrigger: st('.pf-lead'),
      })
      gsap.from('.pf-note', {
        y: 30,
        filter: 'blur(12px)',
        autoAlpha: 0,
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.18,
        scrollTrigger: st('.pf-notes'),
      })

      // capability rows: index swells, rule draws, copy focuses in
      gsap.utils.toArray('.cap').forEach((row) => {
        gsap
          .timeline({ scrollTrigger: st(row, 'top 88%') })
          .set(row, { autoAlpha: 1 })
          .from(row.querySelector('.cap-idx'), {
            scale: 0.4,
            autoAlpha: 0,
            duration: 0.9,
            ease: 'expo.out',
          })
          .fromTo(
            row.querySelector('.cap-rule'),
            { scaleX: 0 },
            { scaleX: 1, duration: 0.9, ease: 'power3.inOut' },
            '-=0.7'
          )
          .from(
            [row.querySelector('.cap-title'), row.querySelector('.cap-desc')],
            { yPercent: 60, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08 },
            '-=0.7'
          )
      })
    },
    { scope: root }
  )

  return (
    <section className="section about" id="about" ref={root}>
      <div className="pf">
        <div className="pf-intro">
          <VideoBg src="/about/intro-bg.mp4" range={[0, 0.5]} />
        {/* top row — kicker on the left, meta on the right */}
        <header className="pf-top">
          <p className="pf-kicker">
            {p.tagline.map((t) => (
              <span className="pf-kick-mask" key={t}>
                <span className="pf-kick">{t}</span>
              </span>
            ))}
          </p>
          <span className="pf-meta">PROFILE / 身份档案</span>
        </header>

        {/* display name */}
        <div className="pf-hero">
          <h2 className="pf-name">
            <span className="pf-zh-mask">
              <span className="pf-zh">王者</span>
            </span>
          </h2>
          <span className="pf-en">Steven&nbsp;Wang</span>
        </div>

        {/* lead statement, right-offset like an editorial column */}
        <p className="pf-lead">{p.paragraphs[0]}</p>

        <div className="pf-notes">
          {p.paragraphs.slice(1).map((para, i) => (
            <p className="pf-note" key={i}>
              {para}
            </p>
          ))}
        </div>
        </div>

        {/* core strengths */}
        <div className="pf-caps">
          <VideoBg src="/about/caps-bg.mp4" range={[0.5, 1]} />
          <span className="pf-caps-tag">核心能力 — Core Strengths</span>
          <ul>
            {p.capabilities.map((c) => (
              <li className="cap" key={c.no}>
                <span className="cap-idx">{c.no}</span>
                <h4 className="cap-title">{c.title}</h4>
                <span className="cap-rule" aria-hidden="true" />
                <p className="cap-desc">{c.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
