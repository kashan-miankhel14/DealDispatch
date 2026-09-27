import { performanceScore } from './model'
import type { DemoTeam, Person } from './model'

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

export function DemoOrgChart({ teams, people, onSelectPerson }: { teams: DemoTeam[]; people: Person[]; onSelectPerson: (id: string) => void }) {
  return <section className="demo-org-panel" aria-label="Synthetic SDR management hierarchy">
    <div className="demo-org-heading">
      <div><span className="kicker">ILLUSTRATIVE REPORTING LINES · SYNTHETIC DATA</span><h2>Who manages each SDR team?</h2><p>Use this sample hierarchy to review team focus, coverage, workload and outcomes. It is not your Graph8 org chart.</p></div>
      <span className="source-pill">FICTIONAL ORG</span>
    </div>
    <div className="demo-org-grid">
      {teams.map(team => {
        const members = team.memberIds.map(id => people.find(person => person.id === id)).filter((person): person is Person => Boolean(person))
        const available = members.filter(person => person.activeContract && person.onDuty && person.load < person.capacity).length
        const handoffs = members.reduce((total, person) => total + person.metrics.qualifiedHandoffs, 0)
        const pipeline = members.reduce((total, person) => total + person.metrics.qualifiedPipeline, 0)
        return <article className="demo-org-team" key={team.id}>
          <header className="demo-org-manager">
            <span className="demo-org-manager-avatar">{initials(team.managerName)}</span>
            <span className="demo-org-manager-meta"><small>TEAM MANAGER</small><b>{team.managerName}</b><span>{team.name}</span></span>
            <span className="demo-org-member-count">{members.length} SDRs</span>
          </header>
          <p className="demo-org-focus"><b>Focus</b> {team.focus}</p>
          <div className="demo-org-connector" aria-hidden="true"/>
          <div className="demo-org-members">
            {members.map(person => {
              const availableNow = person.activeContract && person.onDuty && person.load < person.capacity
              const state = !person.activeContract ? 'Inactive' : !person.onDuty ? 'Off duty' : person.load >= person.capacity ? 'At capacity' : 'Available'
              return <button className="demo-org-member" key={person.id} onClick={() => onSelectPerson(person.id)}>
                <span className={`demo-org-avatar ${person.source === 'Contracted talent' ? 'contracted' : ''}`}>{initials(person.name)}</span>
                <span className="demo-org-member-main"><b>{person.name}</b><small>{person.role} · {person.source}</small></span>
                <span className={`demo-org-status ${availableNow ? 'available' : 'unavailable'}`}>{state}</span>
                <span className="demo-org-member-stats">{person.metrics.qualifiedHandoffs} qualified handoffs <i/> work {person.load}/{person.capacity} <i/> impact {performanceScore(person)}</span>
              </button>
            })}
          </div>
          <footer className="demo-org-summary"><span>{available}/{members.length} available</span><span>{handoffs} qualified handoffs</span><span>${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(pipeline)} pipeline</span></footer>
        </article>
      })}
    </div>
  </section>
}
