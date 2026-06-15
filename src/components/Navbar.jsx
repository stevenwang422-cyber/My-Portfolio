import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { useScrollTo } from '../lib/ScrollContext.js'
import { resume } from '../data/resume.js'

const links = [
  { label: 'About', href: '#about' },
  { label: 'Clients', href: '#clients' },
  { label: 'Experience', href: '#experience' },
  { label: 'Work', href: '#work' },
  { label: 'Contact', href: '#contact' },
]

export default function Navbar({ started }) {
  const root = useRef(null)
  const [open, setOpen] = useState(false)
  const scrollTo = useScrollTo()

  useGSAP(
    () => {
      if (!started) return
      gsap.to('.nav .nav-toggle', {
        y: 0,
        autoAlpha: 1,
        duration: 0.9,
        ease: 'power3.out',
        delay: 0.3,
      })
    },
    { scope: root, dependencies: [started] }
  )

  // inside the hero the faint name watermark owns the corner; the logo
  // takes over once the hero scrolls away
  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: '.hero',
      start: 'bottom 75%',
      onEnter: () =>
        gsap.to('.nav-logo', { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out' }),
      onLeaveBack: () =>
        gsap.to('.nav-logo', { y: -24, autoAlpha: 0, duration: 0.5, ease: 'power2.in' }),
    })
    return () => st.kill()
  }, [])

  // full-screen drawer wipes down from the top; links rise in a stagger
  useGSAP(
    () => {
      if (open) {
        gsap
          .timeline()
          .set('.menu-overlay', { display: 'flex' })
          .fromTo(
            '.menu-overlay',
            { clipPath: 'inset(0 0 100% 0)' },
            { clipPath: 'inset(0 0 0% 0)', duration: 0.8, ease: 'power4.inOut' }
          )
          .fromTo(
            '.menu-link',
            { yPercent: 120 },
            { yPercent: 0, stagger: 0.07, duration: 0.8, ease: 'power3.out' },
            '-=0.35'
          )
          .fromTo('.menu-foot', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, '-=0.4')
      } else {
        gsap
          .timeline()
          .to('.menu-overlay', {
            clipPath: 'inset(0 0 100% 0)',
            duration: 0.7,
            ease: 'power4.inOut',
          })
          .set('.menu-overlay', { display: 'none' })
      }
    },
    { scope: root, dependencies: [open] }
  )

  const go = (e, href) => {
    e.preventDefault()
    setOpen(false)
    setTimeout(() => scrollTo(href), 500)
  }

  return (
    <header ref={root}>
      <div className="nav">
        <a
          className="nav-item nav-logo"
          href="#top"
          onClick={(e) => {
            e.preventDefault()
            scrollTo(0)
          }}
        >
          {resume.shortName}
          <span className="accent">.</span>
        </a>
        <button className="nav-item nav-toggle" onClick={() => setOpen(true)}>
          Menu
        </button>
      </div>

      <div className="menu-overlay">
        <div className="menu-head">
          <span className="menu-brand">{resume.chineseName} · {resume.name}</span>
          <button className="nav-toggle" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
        <nav className="menu-links">
          {links.map((l, i) => (
            <a key={l.label} className="menu-row" href={l.href} onClick={(e) => go(e, l.href)}>
              <span className="menu-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="menu-mask">
                <span className="menu-link">{l.label}</span>
              </span>
            </a>
          ))}
        </nav>
        <div className="menu-foot">
          <span>{resume.location}</span>
          <a href={`mailto:${resume.email}`}>{resume.email}</a>
        </div>
      </div>
    </header>
  )
}
