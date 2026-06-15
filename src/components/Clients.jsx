import { resume } from '../data/resume.js'
import SectionHeader from './SectionHeader.jsx'

export default function Clients() {
  return (
    <section className="section clients" id="clients">
      <SectionHeader index="02" title="Clients" />
      {resume.clients.map((g) => (
        <div className="client-row" data-reveal key={g.group}>
          <h3 className="client-group-label">
            <span>{g.group}</span>
            <em>{g.en}</em>
          </h3>
          <ul className="client-grid">
            {g.items.map((c) => (
              <li className="client-tile" key={c.name} title={c.name}>
                {c.logo ? (
                  <img
                    className={`client-logo${c.mono ? ' is-mono' : ''}${c.app ? ' is-app' : ''}`}
                    src={c.logo}
                    alt={c.name}
                    loading="lazy"
                  />
                ) : (
                  <span className="client-word">{c.name.split(' ')[0]}</span>
                )}
                <span className="client-name">{c.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
