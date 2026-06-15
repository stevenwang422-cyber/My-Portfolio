import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { resume } from '../data/resume.js'
import SectionHeader from './SectionHeader.jsx'

export default function Experience() {
  const root = useRef(null)

  // enerblock-style entrance: an amber bar sweeps across the card,
  // content appears beneath it mid-sweep, the logo unmasks left→right
  useGSAP(
    () => {
      gsap.utils.toArray('.exp-row').forEach((row) => {
        const wipe = row.querySelector('.exp-wipe')
        const content = row.querySelectorAll('.exp-side, .exp-main')
        const logo = row.querySelector('.exp-logo')

        gsap
          .timeline({ scrollTrigger: { trigger: row, start: 'top 84%' } })
          .set(row, { autoAlpha: 1 })
          .set(content, { autoAlpha: 0 })
          .set(logo, { clipPath: 'inset(0 100% 0 0)' })
          .fromTo(
            wipe,
            { scaleX: 0, transformOrigin: '0% 50%' },
            { scaleX: 1, duration: 0.45, ease: 'power3.in' }
          )
          .set(content, { autoAlpha: 1 })
          .set(wipe, { transformOrigin: '100% 50%' })
          .to(wipe, { scaleX: 0, duration: 0.55, ease: 'power3.out' })
          .to(logo, { clipPath: 'inset(0 0% 0 0)', duration: 0.9, ease: 'power4.out' }, '<+0.1')
      })
    },
    { scope: root }
  )

  return (
    <section className="section experience" id="experience" ref={root}>
      <SectionHeader index="03" title="Experience" />
      <div className="exp-list">
        {resume.experience.map((job) => (
          <article className="exp-row wipe-reveal" key={`${job.company}-${job.period}`}>
            <span className="exp-wipe" aria-hidden="true" />
            <div className="exp-side">
              <span className="exp-period">{job.period}</span>
              <img
                className={`exp-logo${job.mono ? ' is-mono' : ''}`}
                src={job.logo}
                alt={job.company}
                loading="lazy"
              />
            </div>
            <div className="exp-main">
              <h3 className="exp-role">{job.role}</h3>
              <p className="exp-company">{job.company}</p>
              <p className="exp-desc">{job.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
