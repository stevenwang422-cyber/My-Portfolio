import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { resume } from '../data/resume.js'

export default function MoreWork() {
  const [open, setOpen] = useState(false)
  const overlay = useRef(null)

  // open / close choreography
  useGSAP(
    () => {
      if (open) {
        gsap.set(overlay.current, { display: 'block' })
        gsap
          .timeline()
          .to('.mw-backdrop', { autoAlpha: 1, duration: 0.4, ease: 'power2.out' })
          .fromTo(
            '.mw-panel',
            { yPercent: 6, autoAlpha: 0 },
            { yPercent: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out' },
            '-=0.2'
          )
          .from('.mw-item', { y: 22, autoAlpha: 0, stagger: 0.03, duration: 0.5, ease: 'power2.out' }, '-=0.3')
      } else {
        gsap
          .timeline()
          .to('.mw-panel', { yPercent: 4, autoAlpha: 0, duration: 0.35, ease: 'power2.in' })
          .to('.mw-backdrop', { autoAlpha: 0, duration: 0.3 }, '-=0.2')
          .set(overlay.current, { display: 'none' })
      }
    },
    { dependencies: [open], scope: overlay }
  )

  // close on Escape
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const total = resume.otherWork.reduce((n, g) => n + g.items.length, 0)

  return (
    <>
      <div className="morework" data-reveal>
        <button className="morework-btn" onClick={() => setOpen(true)}>
          <span className="morework-label">其他业务 · More Work</span>
          <span className="morework-count">{total} 个项目</span>
          <span className="morework-plus" aria-hidden="true">
            ＋
          </span>
        </button>
      </div>

      <div className="mw-modal" ref={overlay}>
        <div className="mw-backdrop" onClick={() => setOpen(false)} />
        <div className="mw-panel" role="dialog" aria-modal="true" aria-label="其他业务">
          <header className="mw-head">
            <h3 className="mw-title">
              其他业务 <span>{total} Projects</span>
            </h3>
            <button className="mw-close" onClick={() => setOpen(false)}>
              关闭 ✕
            </button>
          </header>
          <div className="mw-list" data-lenis-prevent>
            {resume.otherWork.map((g) => (
              <div className="mw-group" key={g.group}>
                <h4 className="mw-group-title">{g.group}</h4>
                <ul>
                  {g.items.map((title) => (
                    <li className={`mw-item${title.length > 20 ? ' is-wide' : ''}`} key={title}>
                      {title}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
