export default function SectionHeader({ index, title }) {
  return (
    <div className="section-header" data-reveal>
      <span className="section-index">/{index}</span>
      <h2 className="section-title">{title}</h2>
    </div>
  )
}
