import { useMemo, useState } from 'react'
import { performanceScore } from './model'
import type { Person } from './model'
import './Analytics.css'

type MetricMap = Record<string, string | number | boolean>
type TrendRow = { period: string | null; metrics: MetricMap }
type RepRow = { id: string | null; name: string; role: string; metrics: MetricMap }
type SourceState = 'live' | 'empty' | 'error' | null

const numericValue = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = Number(value.replaceAll(',', '').replace(/%$/, ''))
  return Number.isFinite(parsed) ? parsed : null
}

const labelFor = (key: string) => key.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())

const formatMetric = (value: number, key: string) => {
  if (/rate|percent|conversion|success|sla/i.test(key)) {
    const percentage = Math.abs(value) <= 1 ? value * 100 : value
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(percentage)}%`
  }
  if (/pipeline|revenue|amount|value|arr/i.test(key)) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(value)
  }
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function metricOptions(rows: { metrics: MetricMap }[]) {
  const counts = new Map<string, number>()
  rows.forEach(row => Object.entries(row.metrics).forEach(([key, value]) => {
    if (numericValue(value) !== null) counts.set(key, (counts.get(key) ?? 0) + 1)
  }))
  const preferred = ['qualified_handoffs', 'meetings_booked', 'total_meetings', 'total_dials', 'total_connected', 'total_replies', 'total_emails_sent']
  return [...counts.keys()].sort((left, right) => {
    const leftRank = preferred.indexOf(left)
    const rightRank = preferred.indexOf(right)
    return (leftRank < 0 ? preferred.length : leftRank) - (rightRank < 0 ? preferred.length : rightRank) || left.localeCompare(right)
  })
}

const periodLabel = (period: string | null, index: number) => {
  if (!period) return `Period ${index + 1}`
  const date = new Date(period)
  return Number.isNaN(date.getTime()) ? period : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Graph8TrendChart({ trends, state, message, loaded, onOpenLive }: {
  trends: TrendRow[]
  state: SourceState
  message?: string
  loaded: boolean
  onOpenLive: () => void
}) {
  const keys = useMemo(() => metricOptions(trends), [trends])
  const [selectedKey, setSelectedKey] = useState('')
  const metric = keys.includes(selectedKey) ? selectedKey : keys[0] ?? ''
  const points = trends.map((trend, index) => ({
    label: periodLabel(trend.period, index),
    index,
    value: metric ? numericValue(trend.metrics[metric]) : null,
  })).filter((point): point is { label: string; index: number; value: number } => point.value !== null)
  const maxValue = Math.max(1, ...points.map(point => point.value))
  const minValue = Math.min(0, ...points.map(point => point.value))
  const chart = { left: 52, right: 744, top: 20, bottom: 196 }
  const xAt = (index: number) => chart.left + (trends.length <= 1 ? 0 : index / (trends.length - 1)) * (chart.right - chart.left)
  const yAt = (value: number) => chart.top + (maxValue === minValue ? 0.5 : (maxValue - value) / (maxValue - minValue)) * (chart.bottom - chart.top)
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xAt(point.index)} ${yAt(point.value)}`).join(' ')
  const hasChart = Boolean(metric) && points.length >= 2

  return <section className="analytics-card" aria-label="Live Graph8 activity trend chart">
    <div className="analytics-card-head">
      <div><span className="analytics-eyebrow">LIVE GRAPH8 DATA</span><h3>Activity over time</h3><p>Choose a metric from the actual trend periods returned by Graph8.</p></div>
      <label className="analytics-select-label">Metric<select value={metric} onChange={event => setSelectedKey(event.target.value)} disabled={!keys.length}>
        {keys.map(key => <option value={key} key={key}>{labelFor(key)}</option>)}
      </select></label>
    </div>
    {hasChart ? <>
      <div className="analytics-chart-summary"><span>{labelFor(metric)}</span><strong>{formatMetric(points[points.length - 1].value, metric)}</strong><small>latest period</small></div>
      <svg className="trend-chart" viewBox="0 0 780 250" role="img" aria-label={`${labelFor(metric)} across ${points.length} Graph8 trend periods`}>
        <defs><linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8676dd" stopOpacity=".28"/><stop offset="100%" stopColor="#8676dd" stopOpacity=".02"/></linearGradient></defs>
        {[0, 0.5, 1].map(fraction => {
          const y = chart.top + fraction * (chart.bottom - chart.top)
          const value = maxValue - fraction * (maxValue - minValue)
          return <g key={fraction}><line x1={chart.left} x2={chart.right} y1={y} y2={y} className="chart-gridline"/><text x={chart.left - 10} y={y + 4} textAnchor="end" className="chart-axis-label">{formatMetric(value, metric)}</text></g>
        })}
        <path d={`${path} L ${xAt(points[points.length - 1].index)} ${chart.bottom} L ${xAt(points[0].index)} ${chart.bottom} Z`} className="trend-area"/>
        <path d={path} className="trend-line"/>
        {points.map(point => <g key={`${point.index}-${point.label}`}><circle cx={xAt(point.index)} cy={yAt(point.value)} r="5" className="trend-point"><title>{point.label}: {formatMetric(point.value, metric)}</title></circle><text x={xAt(point.index)} y="224" textAnchor="middle" className="chart-axis-label">{point.label}</text></g>)}
      </svg>
      <div className="chart-footnote">{points.length} of {trends.length} Graph8 periods contain this metric. Values are shown as returned; no sample data is added.</div>
    </> : <div className="analytics-empty">
      <span className="analytics-empty-icon">⌁</span>
      <b>{!loaded ? 'Load your Graph8 snapshot to see real trends' : state === 'error' ? 'Graph8 trend data could not be read' : trends.length < 2 ? 'Not enough Graph8 periods to draw a trend' : 'No numeric trend metrics to chart'}</b>
      <p>{message || (!loaded ? 'Refresh the live Graph8 view. This chart never fills missing organization data with demo values.' : 'Graph8 did not return at least two numeric points for a trend. No sample values are mixed into this chart.')}</p>
      <button className="analytics-text-button" onClick={onOpenLive}>Open live Graph8 data →</button>
    </div>}
  </section>
}

function Graph8RepChart({ reps, state, message, loaded, onOpenLive }: {
  reps: RepRow[]
  state: SourceState
  message?: string
  loaded: boolean
  onOpenLive: () => void
}) {
  const keys = useMemo(() => metricOptions(reps), [reps])
  const [selectedKey, setSelectedKey] = useState('')
  const metric = keys.includes(selectedKey) ? selectedKey : keys[0] ?? ''
  const rows = reps.map(rep => ({ ...rep, value: metric ? numericValue(rep.metrics[metric]) : null }))
    .filter((rep): rep is RepRow & { value: number } => rep.value !== null)
    .sort((left, right) => right.value - left.value)
  const maxValue = Math.max(1, ...rows.map(row => row.value))

  return <section className="analytics-card" aria-label="Live Graph8 SDR comparison chart">
    <div className="analytics-card-head">
      <div><span className="analytics-eyebrow">LIVE GRAPH8 DATA</span><h3>SDR comparison</h3><p>Compare only the reps and metrics Graph8 returned.</p></div>
      <label className="analytics-select-label">Metric<select value={metric} onChange={event => setSelectedKey(event.target.value)} disabled={!keys.length}>
        {keys.map(key => <option value={key} key={key}>{labelFor(key)}</option>)}
      </select></label>
    </div>
    {rows.length ? <div className="rep-chart-list">{rows.slice(0, 8).map((rep, index) => <div className="rep-chart-row" key={rep.id ?? rep.name}>
      <span className="rep-chart-rank">{String(index + 1).padStart(2, '0')}</span>
      <div className="rep-chart-main"><b>{rep.name}</b><small>{rep.role || 'Graph8 SDR'}</small><div className="rep-chart-track"><i style={{ width: `${Math.max(0, rep.value / maxValue * 100)}%` }}/></div></div>
      <strong>{formatMetric(rep.value, metric)}</strong>
    </div>)}</div> : <div className="analytics-empty">
      <span className="analytics-empty-icon">♙</span>
      <b>{!loaded ? 'Load your Graph8 snapshot to compare SDRs' : state === 'error' ? 'Graph8 leaderboard could not be read' : 'No Graph8 leaderboard rows to compare'}</b>
      <p>{message || (!loaded ? 'Refresh live Graph8 data to request the organization leaderboard.' : 'No synthetic reps are substituted here. The separate demo scorecard below uses clearly labeled sample people.')}</p>
      <button className="analytics-text-button" onClick={onOpenLive}>Open live Graph8 data →</button>
    </div>}
  </section>
}

function SyntheticAnalytics({ people, onFocusPerson }: { people: Person[]; onFocusPerson: (id: string) => void }) {
  const activePeople = people.filter(person => person.activeContract)
  const totals = activePeople.reduce((sum, person) => ({
    dials: sum.dials + person.metrics.dials,
    connections: sum.connections + person.metrics.connections,
    meetings: sum.meetings + person.metrics.meetingsBooked,
    handoffs: sum.handoffs + person.metrics.qualifiedHandoffs,
  }), { dials: 0, connections: 0, meetings: 0, handoffs: 0 })
  const stages = [
    { label: 'Outbound dials', value: totals.dials },
    { label: 'Connected', value: totals.connections },
    { label: 'Meetings booked', value: totals.meetings },
    { label: 'Qualified handoffs', value: totals.handoffs },
  ]
  const maxStage = Math.max(1, ...stages.map(stage => stage.value))
  const pipelineRows = [...activePeople].sort((left, right) => right.metrics.qualifiedPipeline - left.metrics.qualifiedPipeline)
  const maxPipeline = Math.max(1, ...pipelineRows.map(person => person.metrics.qualifiedPipeline))

  return <section className="synthetic-analytics">
    <div className="analytics-section-head"><div><span className="analytics-eyebrow">SYNTHETIC DEMO DATA · NOT GRAPH8 CUSTOMER DATA</span><h2>Preview the analytics experience</h2><p>These charts use fictional sample SDRs. They update when you record outcomes in the urgency simulator.</p></div><span className="analytics-source-badge demo-badge">SAMPLE ONLY</span></div>
    <div className="analytics-chart-grid demo-chart-grid">
      <section className="analytics-card" aria-label="Synthetic SDR activity funnel">
        <div className="analytics-card-head"><div><span className="analytics-eyebrow">TEAM FUNNEL</span><h3>Activity to qualified outcomes</h3><p>Aggregate sample counts; conversion is relative to the prior stage.</p></div></div>
        <div className="funnel-chart" role="img" aria-label="Synthetic sales activity funnel from dials to qualified handoffs">
          {stages.map((stage, index) => {
            const conversion = index === 0 ? null : stages[index - 1].value ? stage.value / stages[index - 1].value * 100 : 0
            return <div className="funnel-stage" key={stage.label}>
              <div className="funnel-stage-label"><b>{stage.label}</b><strong>{stage.value.toLocaleString()}</strong></div>
              <div className="funnel-track"><i className={`funnel-fill funnel-fill-${index}`} style={{ width: `${stage.value / maxStage * 100}%` }}/></div>
              <small>{conversion === null ? 'Starting activity' : `${conversion.toFixed(1)}% of previous stage`}</small>
            </div>
          })}
        </div>
        <div className="chart-footnote">Only the synthetic demo dataset is used for this funnel. Dials are context—not a quality score.</div>
      </section>
      <section className="analytics-card" aria-label="Synthetic qualified pipeline by SDR">
        <div className="analytics-card-head"><div><span className="analytics-eyebrow">PIPELINE CONTRIBUTION</span><h3>Qualified pipeline by SDR</h3><p>Select a rep to open their scorecard.</p></div><span className="analytics-total">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(pipelineRows.reduce((sum, person) => sum + person.metrics.qualifiedPipeline, 0))}</span></div>
        <div className="pipeline-chart-list">{pipelineRows.map((person, index) => <button className="pipeline-chart-row" key={person.id} onClick={() => onFocusPerson(person.id)}>
          <span className="rep-chart-rank">{String(index + 1).padStart(2, '0')}</span>
          <span className="pipeline-chart-main"><b>{person.name}</b><span className="pipeline-chart-track"><i style={{ width: `${person.metrics.qualifiedPipeline / maxPipeline * 100}%` }}/></span></span>
          <strong>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(person.metrics.qualifiedPipeline)}</strong>
        </button>)}</div>
        <div className="chart-footnote">Impact score: {activePeople.length ? Math.round(activePeople.reduce((sum, person) => sum + performanceScore(person), 0) / activePeople.length) : 0} average across the demo roster. This is illustrative, not a Graph8 metric.</div>
      </section>
    </div>
  </section>
}

export function AnalyticsDashboard({ trends, trendState, trendMessage, reps, repsState, repsMessage, loaded, people, onOpenLive, onFocusPerson }: {
  trends: TrendRow[]
  trendState: SourceState
  trendMessage?: string
  reps: RepRow[]
  repsState: SourceState
  repsMessage?: string
  loaded: boolean
  people: Person[]
  onOpenLive: () => void
  onFocusPerson: (id: string) => void
}) {
  return <div className="analytics-dashboard">
    <section className="analytics-real-section">
      <div className="analytics-section-head"><div><span className="analytics-eyebrow">REAL ORGANIZATION DATA · GRAPH8 API</span><h2>Live Graph8 analytics</h2><p>Charts use only numeric values returned by your Graph8 organization. Missing rows stay empty—no sample data is blended in.</p></div><span className={`analytics-source-badge ${loaded ? 'live-badge' : ''}`}>{loaded ? 'LIVE SNAPSHOT' : 'NOT LOADED'}</span></div>
      <div className="analytics-chart-grid">
        <Graph8TrendChart trends={trends} state={trendState} message={trendMessage} loaded={loaded} onOpenLive={onOpenLive}/>
        <Graph8RepChart reps={reps} state={repsState} message={repsMessage} loaded={loaded} onOpenLive={onOpenLive}/>
      </div>
    </section>
    <SyntheticAnalytics people={people} onFocusPerson={onFocusPerson}/>
  </div>
}
