import { useRef } from 'react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { resume } from '../data/resume.js'

// "工作之外" — the Shanghai-lockdown volunteer chapter. Documentary photos
// as an archival backdrop, the volunteer systems, and the Lu Xun quote
// rendered in brush calligraphy with a stroke-by-stroke ink reveal.
export default function Manifesto() {
  const root = useRef(null)
  const b = resume.beyond

  useGSAP(
    () => {
      const reveal = (sel, vars) =>
        gsap.from(sel, {
          autoAlpha: 0,
          y: 30,
          duration: 1.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: sel, start: 'top 86%' },
          ...vars,
        })

      reveal('.vol-eyebrow')
      reveal('.vol-title')
      reveal('.vol-intro', { duration: 1.3 })
      reveal('.vol-sys', { stagger: 0.1 })

      // highlighter swipe behind 工作之外, then a slow shimmer loop
      gsap
        .timeline({ scrollTrigger: { trigger: '.vol-eyebrow', start: 'top 84%' } })
        .fromTo(
          '.vol-hl-bar',
          { scaleX: 0 },
          { scaleX: 1, duration: 0.7, ease: 'power3.inOut', delay: 0.4 }
        )
        .fromTo(
          '.vol-hl-text',
          { backgroundPositionX: '120%' },
          { backgroundPositionX: '-20%', duration: 1.1, ease: 'power2.out' },
          '-=0.3'
        )

      // brush calligraphy: each character is "pressed" onto the paper with
      // a quick ink-bleed + clip wipe — faster, with a stronger brush bite
      const split = new SplitText('.vol-ph', { type: 'chars' })
      split.chars.forEach((c) => (c.style.display = 'inline-block'))
      gsap.set('.vol-quote', { autoAlpha: 1 })
      gsap.from(split.chars, {
        clipPath: 'inset(0 105% 0 -5%)',
        filter: 'blur(12px)',
        autoAlpha: 0,
        scale: 1.22,
        transformOrigin: 'left center',
        duration: 0.34,
        ease: 'power3.out',
        stagger: 0.06,
        scrollTrigger: { trigger: '.vol-quote', start: 'top 80%' },
      })
      gsap.from('.vol-quote-by', {
        autoAlpha: 0,
        duration: 1,
        delay: 0.3,
        scrollTrigger: { trigger: '.vol-quote', start: 'top 78%' },
      })
    },
    { scope: root }
  )

  return (
    <section className="volunteer" id="beyond" ref={root}>
      <div className="vol-bg" aria-hidden="true">
        <img src="/work/volunteer-1.png" alt="" loading="lazy" />
      </div>

      <div className="vol-inner">
        <div className="vol-eyebrow">
          <span className="vol-hl">
            <span className="vol-hl-bar" aria-hidden="true" />
            <span className="vol-hl-text">工作之外</span>
          </span>
          <span className="vol-eyebrow-en">Beyond Work</span>
        </div>
        <h2 className="vol-title">
          {b.volunteerTitle}
          <span className="vol-period">{b.volunteerPeriod}</span>
        </h2>
        <p className="vol-intro">{b.intro}</p>

        <ul className="vol-systems">
          {b.systems.map((s) => (
            <li className="vol-sys" key={s.title}>
              <span className="vol-sys-metric">{s.metric}</span>
              <span className="vol-sys-title">{s.title}</span>
              <span className="vol-sys-note">{s.note}</span>
            </li>
          ))}
        </ul>

        <blockquote className="vol-quote-wrap">
          <p className="vol-quote">
            <span className="vol-line">
              <span className="vol-ph">有一分热，</span>
              <span className="vol-ph">发一分光，</span>
              <span className="vol-ph">就令萤火一般，</span>
            </span>
            <span className="vol-line">
              <span className="vol-ph">也可以在黑暗里发一点光，</span>
              <span className="vol-ph">不必等候炬火。</span>
            </span>
          </p>
          <cite className="vol-quote-by">— {b.quoteBy}</cite>
        </blockquote>
      </div>
    </section>
  )
}
