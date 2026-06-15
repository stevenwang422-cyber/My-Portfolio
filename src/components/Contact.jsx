import { useState } from 'react'
import { resume } from '../data/resume.js'
import Magnetic from './Magnetic.jsx'

export default function Contact() {
  const [copied, setCopied] = useState('')

  const copy = (value) => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(value)
      setTimeout(() => setCopied(''), 1800)
    })
  }

  return (
    <footer className="section contact" id="contact">
      <h2 className="contact-title" data-reveal>
        Let&rsquo;s work <em>together</em>
      </h2>
      <div className="contact-cta" data-reveal>
        <Magnetic>
          <a className="contact-email" href={`mailto:${resume.email}`}>
            {resume.email}
          </a>
        </Magnetic>
      </div>
      <div className="contact-foot">
        <span>
          © {new Date().getFullYear()} {resume.name}
        </span>
        <nav className="contact-socials">
          {resume.socials.map((s) =>
            s.copy ? (
              <button
                key={s.label}
                className="contact-copy"
                onClick={() => copy(s.value)}
                aria-label={`复制 ${s.value}`}
              >
                {s.label} · {s.value}
                <span className={`copy-hint${copied === s.value ? ' is-on' : ''}`}>已复制 ✓</span>
              </button>
            ) : s.url ? (
              <a key={s.label} href={s.url}>
                {s.label}
              </a>
            ) : (
              <span key={s.label}>{s.label}</span>
            )
          )}
        </nav>
        <span>{resume.location}</span>
      </div>
    </footer>
  )
}
