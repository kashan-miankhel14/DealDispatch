import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { addMinutes, candidateRank, chooseNext, demoSeed, eligible, makeLog, matchesQueueFilter, performanceScore } from './model'
import type { DemoState, Log, Opportunity, Person, QueueFilter } from './model'
import './App.css'
import './Urgency.css'
import './Prospects.css'
import './DemoPreview.css'
import './AiOutreach.css'
import './Presentation.css'

const STORAGE_KEY = 'dealdispatch.demo.v2'
const INITIAL_NOW = Date.now()
type Section = 'live' | 'team' | 'assignment' | 'activity'
type Connection = { mode: 'loading' | 'demo' | 'connected' | 'partial' | 'error'; message: string }
type LiveSource<T> = { state: 'live' | 'empty' | 'error'; count: number; items: T[]; message?: string }
type LiveMetricSource = { state: 'live' | 'empty' | 'error'; count: number; metrics: Record<string, string | number | boolean>; message?: string }
type LiveSdr = { id: string | null; name: string; role: string; metrics: Record<string, string | number | boolean> }
type LiveTrend = { period: string | null; metrics: Record<string, string | number | boolean> }
type LiveTask = { id: string; title: string; status: string; priority: number | string | null; dueAt: string | null; assigneeId: string | null; assigneeName: string | null; entityId: string | null; entityLabel: string | null; entityType: string | null }
type LiveMember = { id: string | null; name: string; role: string; active: boolean | null; expertise: string[] }
type GlobalProspect = { name: string; title?: string; seniority?: string; company?: string; domain?: string; industry?: string; location?: string; workEmail?: string; linkedinUrl?: string; confidence?: number | null; website?: string; employeeCount?: string; revenue?: string; description?: string }
type ProspectSearchState = { status: 'idle' | 'loading' | 'success' | 'error'; kind: 'contacts' | 'companies'; count: number; results: GlobalProspect[]; message?: string }
type AiOutreachDraft = { subject: string; emailBody: string; personalization: string; discoveryQuestion: string; evidenceUsed: string[]; caveat: string; model: string }
type AiOutreachState = { status: 'idle' | 'loading' | 'success' | 'error'; key?: string; draft?: AiOutreachDraft; message?: string }
type Graph8Snapshot = {
  mode: 'connected' | 'partial' | 'error'
  fetchedAt: string
  access: 'read-only'
  taskWritesEnabled: boolean
  sources: { sdrs: LiveSource<LiveSdr>; activity: LiveSource<LiveSdr>; summary: LiveMetricSource; dialer: LiveMetricSource; trends: LiveSource<LiveTrend>; tasks: LiveSource<LiveTask>; members: LiveSource<LiveMember> }
  counts: { sdrs: number; activityRows: number; activeSdrs: number; openTasks: number; teamMembers: number }
}

function restore(): DemoState {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!Array.isArray(saved?.opportunities) || !Array.isArray(saved?.people) || !saved.people[0]?.metrics || !Array.isArray(saved?.log)) return structuredClone(demoSeed)
    return {
      ...saved,
      opportunities: saved.opportunities.map((item: Opportunity) => ({
        ...item,
        urgency: item.urgency ?? 'high',
        tried: item.tried ?? [],
        dispatches: item.dispatches ?? 0,
      })),
    } as DemoState
  } catch {
    return structuredClone(demoSeed)
  }
}

const cash = (n: number) => '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
const compactCash = (n: number) => '$' + new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
const clock = (date: number) => new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(date)
const initials = (name: string) => name.split(' ').slice(0, 2).map(word => word[0]).join('').toUpperCase()
const confidence = (person: Person) => person.metrics.completedAssignments >= 25 ? 'Strong sample' : person.metrics.completedAssignments >= 10 ? 'Building sample' : 'Early signal'
const isSdrRole = (role: string) => /\b(sdr|bdr|sales development|business development|sales rep)\b/i.test(role)
const liveValue = (value: string | number | boolean, key = '') => {
  if (typeof value !== 'number') return String(value)
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)
  if (/rate|percent/i.test(key)) return `${value <= 1 ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value * 100) : formatted}%`
  return formatted
}
const liveLabel = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
const priorityRank = (value: LiveTask['priority']) => {
  if (typeof value === 'number') return value === 0 ? 5 : value
  return ({ urgent: 1, high: 2, medium: 3, normal: 3, low: 4, none: 5 } as Record<string, number>)[String(value ?? '').toLowerCase()] ?? 5
}
const livePriority = (value: LiveTask['priority']) => typeof value === 'number'
  ? ({ 0: 'none', 1: 'urgent', 2: 'high', 3: 'normal', 4: 'low' } as Record<number, string>)[value] ?? `priority ${value}`
  : value || 'not set'
const orderedLiveMetrics = (metrics: LiveMetricSource['metrics']) => {
  const priority = ['active_sdrs', 'qualified_handoffs', 'meetings_booked', 'total_meetings', 'today_meetings_booked', 'success_rate', 'total_replies', 'total_emails_sent', 'avg_reply_rate', 'total_connected', 'today_connected', 'connection_rate', 'today_connect_rate', 'total_dials', 'today_dials', 'talk_time_minutes', 'avg_call_duration_minutes', 'redial_count', 'voicemail_rate']
  return Object.entries(metrics).sort(([left], [right]) => {
    const leftIndex = priority.findIndex(key => left.endsWith(key))
    const rightIndex = priority.findIndex(key => right.endsWith(key))
    return (leftIndex < 0 ? priority.length : leftIndex) - (rightIndex < 0 ? priority.length : rightIndex)
  })
}

export default function App() {
  const [data, setData] = useState<DemoState>(restore)
  const [selectedId, setSelectedId] = useState(data.opportunities[0]?.id ?? '')
  const [focusedPersonId, setFocusedPersonId] = useState('maya')
  const [section, setSection] = useState<Section>('live')
  const [connection, setConnection] = useState<Connection>({ mode: 'loading', message: 'Connecting to Graph8…' })
  const [liveSnapshot, setLiveSnapshot] = useState<Graph8Snapshot | null>(null)
  const [prospectKind, setProspectKind] = useState<'contacts' | 'companies'>('contacts')
  const [prospectQuery, setProspectQuery] = useState('CEO')
  const [prospectIndustry, setProspectIndustry] = useState('')
  const [prospectCountry, setProspectCountry] = useState('')
  const [prospectLimit, setProspectLimit] = useState(3)
  const [prospectSearch, setProspectSearch] = useState<ProspectSearchState>({ status: 'idle', kind: 'contacts', count: 0, results: [] })
  const [outreachOffer, setOutreachOffer] = useState('DealDispatch helps sales teams route urgent buyer signals to qualified SDRs and prepare manager-reviewed first-touch outreach.')
  const [aiOutreach, setAiOutreach] = useState<AiOutreachState>({ status: 'idle' })
  const [liveAssigneeByTask, setLiveAssigneeByTask] = useState<Record<string, string>>({})
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null)
  const [offerWindowSeconds, setOfferWindowSeconds] = useState(30)
  const [now, setNow] = useState(INITIAL_NOW)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [filter, setFilter] = useState<QueueFilter>('all')

  const selected = data.opportunities.find(item => item.id === selectedId)
  const focusedPerson = data.people.find(person => person.id === focusedPersonId) ?? data.people[0]
  const rankedPeople = useMemo(() => data.people.filter(person => person.activeContract).sort((a, b) => performanceScore(b) - performanceScore(a)), [data.people])
  const rankedCandidates = useMemo(() => selected
    ? data.people.map(person => ({ person, score: candidateRank(person, selected), canTake: eligible(person, selected) }))
      .sort((a, b) => Number(b.canTake) - Number(a.canTake) || b.score - a.score)
    : [], [data.people, selected])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch { /* Keep the demo usable if browser storage is disabled. */ }
  }, [data])

  const offerTo = (opportunity: Opportunity, personId: string) => {
    if (!opportunity || (opportunity.state !== 'new' && opportunity.state !== 'gap')) return
    const person = data.people.find(item => item.id === personId)
    if (!person || !eligible(person, opportunity)) return
    const offered = {
      ...opportunity,
      state: 'offered' as const,
      owner: undefined,
      offeredTo: person.id,
      expiresAt: now + offerWindowSeconds * 1000,
      dispatches: opportunity.dispatches + 1,
    }
    setData(old => ({
      ...old,
      opportunities: old.opportunities.map(item => item.id === opportunity.id ? offered : item),
      log: [makeLog(offered, `Urgent offer opened for ${person.name} · ${offerWindowSeconds}s to accept`, 'offered', person), ...old.log].slice(0, 60),
    }))
    setToast(`Urgent offer opened for ${person.name}`)
  }

  const acceptOffer = (opportunity: Opportunity) => {
    if (opportunity.state !== 'offered' || !opportunity.offeredTo) return
    if (opportunity.expiresAt && opportunity.expiresAt <= now) {
      setToast('The acceptance window expired. Automatic rerouting is processing.')
      return
    }
    const person = data.people.find(item => item.id === opportunity.offeredTo)
    if (!person) return setToast('The offered SDR is no longer in the demo roster')
    if (!eligible(person, opportunity)) return setToast('The offered SDR no longer meets the capacity or skill requirements')
    const accepted = { ...opportunity, state: 'owned' as const, owner: person.id, offeredTo: undefined, expiresAt: undefined }
    setData(old => ({
      ...old,
      people: old.people.map(item => item.id === person.id ? { ...item, load: item.load + 1 } : item),
      opportunities: old.opportunities.map(item => item.id === opportunity.id ? accepted : item),
      log: [makeLog(accepted, `${person.name} accepted the urgent offer`, 'accepted', person), ...old.log].slice(0, 60),
    }))
    setToast(`${person.name} accepted · ${opportunity.company} is owned`)
  }

  const rerouteOffer = (opportunity: Opportunity, expired = false) => {
    if (opportunity.state !== 'offered' || !opportunity.offeredTo) return
    const previousPerson = data.people.find(item => item.id === opportunity.offeredTo)
    const tried = [...new Set([...opportunity.tried, opportunity.offeredTo])]
    const next = chooseNext(data.people, { ...opportunity, tried })
    const updated: Opportunity = next
      ? { ...opportunity, state: 'offered', offeredTo: next.id, tried, expiresAt: now + offerWindowSeconds * 1000, dispatches: opportunity.dispatches + 1 }
      : { ...opportunity, state: 'gap', offeredTo: undefined, tried, expiresAt: undefined }
    const event = expired ? 'Offer expired' : 'Offer declined'
    const log = [
      makeLog(updated, `${event}${previousPerson ? ` by ${previousPerson.name}` : ''}`, expired ? 'expired' : 'declined', previousPerson),
      next
        ? makeLog(updated, `Urgent work rerouted to ${next.name} · ${offerWindowSeconds}s to accept`, 'rerouted', next)
        : makeLog(updated, 'Capacity gap detected · no eligible rep remains in the current pool', 'gap'),
    ]
    setData(old => ({
      ...old,
      opportunities: old.opportunities.map(item => item.id === opportunity.id ? updated : item),
      log: [...log, ...old.log].slice(0, 60),
    }))
    setToast(next ? `Rerouted to ${next.name}` : 'Capacity gap · manager review needed')
  }

  const escalateCoverageGap = (opportunity: Opportunity) => {
    if (opportunity.state !== 'new' || chooseNext(data.people, opportunity)) return
    const gap = { ...opportunity, state: 'gap' as const }
    setData(old => ({
      ...old,
      opportunities: old.opportunities.map(item => item.id === opportunity.id ? gap : item),
      log: [makeLog(gap, 'Coverage gap escalated for manager review · no eligible SDR matched', 'gap'), ...old.log].slice(0, 60),
    }))
    setToast('Coverage gap recorded · manager review needed')
  }

  const recordOutcome = (opportunity: Opportunity, outcome: 'qualified' | 'not_qualified') => {
    if (opportunity.state !== 'owned' || !opportunity.owner || opportunity.outcome) return
    const owner = data.people.find(person => person.id === opportunity.owner)
    if (!owner) return
    const previous = owner.metrics.segmentResults[opportunity.segment] ?? { qualified: 0, completed: 0 }
    const metrics = {
      ...owner.metrics,
      completedAssignments: owner.metrics.completedAssignments + 1,
      qualifiedHandoffs: owner.metrics.qualifiedHandoffs + (outcome === 'qualified' ? 1 : 0),
      qualifiedPipeline: owner.metrics.qualifiedPipeline + (outcome === 'qualified' ? opportunity.value : 0),
      segmentResults: {
        ...owner.metrics.segmentResults,
        [opportunity.segment]: {
          completed: previous.completed + 1,
          qualified: previous.qualified + (outcome === 'qualified' ? 1 : 0),
        },
      },
    }
    const updated = { ...opportunity, outcome }
    const message = outcome === 'qualified'
      ? `Qualified handoff recorded · ${cash(opportunity.value)} added to sourced pipeline`
      : 'Work closed as not qualified · result added to the segment scorecard'
    setData(old => ({
      ...old,
      people: old.people.map(person => person.id === owner.id ? { ...person, load: Math.max(0, person.load - 1), metrics } : person),
      opportunities: old.opportunities.map(item => item.id === opportunity.id ? updated : item),
      log: [makeLog(updated, message, 'outcome', owner), ...old.log].slice(0, 60),
    }))
    setToast(outcome === 'qualified' ? 'Qualified result recorded · SDR rank and cohort fit updated' : 'Outcome recorded · capacity released')
  }

  const addSignal = () => {
    const id = `opp-${crypto.randomUUID()}`
    const opportunity: Opportunity = {
      id, company: 'Apex BioSystems', value: 116000, signal: 'Security review requested',
      evidence: 'A buyer asked to schedule a security review before procurement.', segment: 'Technical buying',
      required: ['Technical evaluation', 'Enterprise'], minutesOld: 0, state: 'new', urgency: 'critical', tried: [], dispatches: 0,
    }
    setData(old => ({ ...old, opportunities: [opportunity, ...old.opportunities], log: [makeLog(opportunity, 'New qualified buying signal · synthetic demo event', 'signal'), ...old.log].slice(0, 60) }))
    setSelectedId(id)
    setSection('assignment')
    setToast('Synthetic buyer work added to the assignment queue')
  }

  const reset = () => {
    setData(structuredClone(demoSeed))
    setSelectedId('opp-1')
    setFocusedPersonId('maya')
    setFilter('all')
    setOfferWindowSeconds(30)
    setNow(Date.now())
    if (section === 'live') setSection('assignment')
    setToast('Demo restored to its starting state')
  }

  const changeQueueFilter = (nextFilter: QueueFilter) => {
    setFilter(nextFilter)
    const nextOpportunity = data.opportunities.find(item => matchesQueueFilter(item, nextFilter))
    setSelectedId(nextOpportunity?.id ?? '')
  }

  const checkGraph8 = async () => {
    setBusy(true)
    try {
      const response = await fetch('/api/graph8/snapshot', { cache: 'no-store' })
      const body = await response.json()
      if (body.mode === 'demo') {
        setLiveSnapshot(null)
        setConnection({ mode: 'demo', message: 'Demo mode · Graph8 SDK key not configured' })
      } else {
        if (body.sources) setLiveSnapshot(body as Graph8Snapshot)
        if (!response.ok) throw new Error(body.message || 'Graph8 could not be checked')
        setLiveSnapshot(body as Graph8Snapshot)
        const { sdrs, activityRows, activeSdrs, openTasks, teamMembers } = body.counts
        setConnection({
          mode: body.mode,
          message: `Graph8 ${body.mode === 'partial' ? 'partial' : 'live'} · ${activeSdrs} active SDRs · ${sdrs} leaderboard · ${activityRows} activity · ${openTasks} open tasks · ${teamMembers} team`,
        })
      }
    } catch (error) {
      setConnection({ mode: 'error', message: error instanceof Error ? error.message : 'Graph8 connection failed' })
    } finally {
      setBusy(false)
    }
  }

  const searchGlobalProspects = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProspectSearch({ status: 'loading', kind: prospectKind, count: 0, results: [] })
    try {
      const response = await fetch('/api/graph8/prospects/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: prospectKind, query: prospectQuery, industry: prospectIndustry, country: prospectCountry, limit: prospectLimit }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Graph8 global search failed')
      setProspectSearch({ status: 'success', kind: prospectKind, count: result.count ?? result.results?.length ?? 0, results: result.results ?? [] })
    } catch (error) {
      setProspectSearch({ status: 'error', kind: prospectKind, count: 0, results: [], message: error instanceof Error ? error.message : 'Graph8 global search failed' })
    }
  }

  const generateAiOutreach = async (prospect: GlobalProspect, key: string) => {
    if (outreachOffer.trim().length < 10) {
      setAiOutreach({ status: 'error', key, message: 'Add at least 10 characters describing your product or offer first.' })
      return
    }
    setAiOutreach({ status: 'loading', key })
    try {
      const response = await fetch('/api/ai/prospect-outreach', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          valueProposition: outreachOffer.trim(),
          prospect: {
            name: prospect.name,
            title: prospect.title,
            company: prospect.company,
            domain: prospect.domain,
            industry: prospect.industry,
            description: prospect.description,
          },
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Gemini could not draft this outreach')
      setAiOutreach({ status: 'success', key, draft: result as AiOutreachDraft })
    } catch (error) {
      setAiOutreach({ status: 'error', key, message: error instanceof Error ? error.message : 'Gemini draft generation failed' })
    }
  }

  const copyAiOutreach = async (draft: AiOutreachDraft) => {
    try {
      await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.emailBody}`)
      setToast('AI draft copied · review before sending')
    } catch {
      setToast('Clipboard access is unavailable in this browser')
    }
  }

  const assignLiveTask = async (task: LiveTask, assigneeId: string) => {
    if (!liveSnapshot?.taskWritesEnabled) return setToast('Graph8 task writes are disabled for this deployment')
    const member = liveSnapshot?.sources.members.items.find(item => item.id === assigneeId)
    if (!member) return setToast('Refresh the live roster and choose an active SDR')
    if (!window.confirm(`Assign “${task.title}” to ${member.name} in Graph8? This changes the task owner.`)) return
    setAssigningTaskId(task.id)
    try {
      const response = await fetch(`/api/graph8/tasks/${encodeURIComponent(task.id)}/assign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assigneeId }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Graph8 did not confirm the assignment')
      setToast(`Live Graph8 task assigned to ${member.name}`)
      await checkGraph8()
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Graph8 assignment failed')
    } finally {
      setAssigningTaskId(null)
    }
  }

  useEffect(() => {
    const initialRead = window.setTimeout(() => { void checkGraph8() }, 0)
    return () => window.clearTimeout(initialRead)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentTime = Date.now()
      setNow(currentTime)
      setData(old => {
        let changed = false
        const events: Log[] = []
        const opportunities = old.opportunities.map(opportunity => {
          if (opportunity.state !== 'offered' || !opportunity.expiresAt || opportunity.expiresAt > currentTime || !opportunity.offeredTo) return opportunity
          changed = true
          const previousPerson = old.people.find(person => person.id === opportunity.offeredTo)
          const tried = [...new Set([...opportunity.tried, opportunity.offeredTo])]
          const next = chooseNext(old.people, { ...opportunity, tried })
          if (next) {
            const rerouted = { ...opportunity, state: 'offered' as const, offeredTo: next.id, tried, expiresAt: currentTime + offerWindowSeconds * 1000, dispatches: opportunity.dispatches + 1 }
            events.push(makeLog(rerouted, `Offer expired${previousPerson ? ` for ${previousPerson.name}` : ''}`, 'expired', previousPerson))
            events.push(makeLog(rerouted, `Urgent work rerouted to ${next.name} · ${offerWindowSeconds}s to accept`, 'rerouted', next))
            return rerouted
          }
          const gap = { ...opportunity, state: 'gap' as const, offeredTo: undefined, tried, expiresAt: undefined }
          events.push(makeLog(gap, 'Offer expired · capacity gap detected for manager review', 'gap'))
          return gap
        })
        return changed ? { ...old, opportunities, log: [...events.reverse(), ...old.log].slice(0, 60) } : old
      })
    }, 300)
    return () => window.clearInterval(timer)
  }, [offerWindowSeconds])

  const unassignedCount = data.opportunities.filter(item => item.state !== 'owned').length
  const assignedCount = data.opportunities.filter(item => item.state === 'owned' && !item.outcome).length
  const coverageGapCount = data.opportunities.filter(item => item.state === 'gap').length
  const capacityCount = data.people.filter(person => person.activeContract && person.onDuty && person.load < person.capacity).length
  const availableSlots = data.people.filter(person => person.activeContract && person.onDuty).reduce((sum, person) => sum + Math.max(0, person.capacity - person.load), 0)
  const visible = data.opportunities.filter(item => matchesQueueFilter(item, filter))
  const activePeople = data.people.filter(person => person.activeContract)
  const teamQualified = activePeople.reduce((sum, person) => sum + person.metrics.qualifiedHandoffs, 0)
  const teamPipeline = activePeople.reduce((sum, person) => sum + person.metrics.qualifiedPipeline, 0)
  const meanCallGrade = Math.round(activePeople.reduce((sum, person) => sum + person.metrics.callGrade, 0) / Math.max(activePeople.length, 1))
  const nextWork = data.opportunities.find(item => item.state === 'new') ?? data.opportunities.find(item => item.state === 'gap')
  const topCandidate = nextWork ? chooseNext(data.people, nextWork) : undefined
  const topCandidateScore = topCandidate && nextWork ? candidateRank(topCandidate, nextWork) : 0
  const liveLeaderboardRanks = new Map(liveSnapshot?.sources.sdrs.items.flatMap((person, index) => person.id ? [[person.id, index]] : []) ?? [])
  const assignableLiveMembers = liveSnapshot?.sources.members.items
    .filter(member => member.id && member.active === true && isSdrRole(member.role))
    .sort((left, right) => (liveLeaderboardRanks.get(left.id ?? '') ?? Number.MAX_SAFE_INTEGER) - (liveLeaderboardRanks.get(right.id ?? '') ?? Number.MAX_SAFE_INTEGER)) ?? []
  const liveUnassignedTasks = liveSnapshot?.sources.tasks.items
    .filter(task => !task.assigneeId && !task.assigneeName)
    .sort((left, right) => priorityRank(left.priority) - priorityRank(right.priority) || (Date.parse(left.dueAt ?? '') || Number.MAX_SAFE_INTEGER) - (Date.parse(right.dueAt ?? '') || Number.MAX_SAFE_INTEGER)) ?? []
  const workflowStep = selected?.state === 'offered' ? 3 : selected?.state === 'owned' || selected?.state === 'gap' ? 4 : selected ? 2 : 1
  const coachingSignals = focusedPerson ? [
    { label: 'Call quality', value: focusedPerson.metrics.callGrade },
    { label: 'Follow-through', value: focusedPerson.metrics.followThrough },
    { label: 'First-touch SLA', value: focusedPerson.metrics.firstTouchSla },
    { label: 'Meeting conversion vs target', value: Math.min(100, focusedPerson.metrics.meetingsBooked / Math.max(focusedPerson.metrics.connections, 1) / 0.3 * 100) },
  ].sort((a, b) => a.value - b.value) : []
  const coachFocus = coachingSignals[0]
  return <div className="shell">
    <aside className="rail">
      <a className="wordmark" href="#live"><span className="brand-symbol">d<span>.</span></span><span>deald<span>dispatch</span></span></a>
      <div className="rail-label">SDR MANAGEMENT</div>
      <button className={`nav-link ${section === 'live' ? 'nav-active' : ''}`} onClick={() => setSection('live')}><span>◉</span> Live Graph8</button>
      <button className={`nav-link ${section === 'team' ? 'nav-active' : ''}`} onClick={() => setSection('team')}><span>▥</span> Demo scorecard</button>
      <button className={`nav-link ${section === 'assignment' ? 'nav-active' : ''}`} onClick={() => setSection('assignment')}><span>◈</span> Urgency simulation <b>{unassignedCount}</b></button>
      <button className={`nav-link ${section === 'activity' ? 'nav-active' : ''}`} onClick={() => setSection('activity')}><span>◷</span> Demo audit trail</button>
      <div className="rail-spacer"/>
      <div className="rail-foot"><div className="mini-logo">DD</div><div><b>{section === 'live' ? 'Graph8 workspace' : 'Demo workspace'}</b><small>{section === 'live' ? 'Live data · manager controlled' : 'Synthetic SDR data'}</small></div><span className="status-dot"/></div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div className="crumb">DealDispatch <span>/</span> <b>{section === 'live' ? 'Live Graph8 data' : section === 'team' ? 'Demo scorecard' : section === 'assignment' ? 'Urgency simulation' : 'Demo audit trail'}</b></div>
        <div className="top-actions"><span className={`connection-pill ${connection.mode}`}><i/>{connection.message}</span><button className="icon-button" aria-label="Check Graph8 connection" title="Check Graph8 SDK connection" onClick={checkGraph8} disabled={busy}>{busy ? '···' : '↻'}</button><div className="user-dot">KS</div></div>
      </header>

      <div className="content">
        <section className="intro">
          <div>
            <div className="kicker">{section === 'live' ? 'GRAPH8 LIVE DATA · GEMINI AI SALES COPILOT' : section === 'team' ? 'DEMO PERFORMANCE, PUT TO WORK' : section === 'assignment' ? 'URGENT HANDOFF SIMULATION' : 'DEMO EVIDENCE AND OUTCOMES'}</div>
            <h1>{section === 'live' ? <>From buyer signal<br/><em>to a better next step.</em></> : section === 'team' ? <>Measure results.<br/><em>Improve the next assignment.</em></> : section === 'assignment' ? <>Give urgent work<br/><em>its best-fit SDR.</em></> : <>Every assignment,<br/><em>accounted for.</em></>}</h1>
            <p>{section === 'live'
              ? 'DealDispatch pairs live Graph8 SDR data and real prospect search with Gemini-drafted outreach. Urgent rep eligibility stays rule-based; managers review every draft and action.'
              : section === 'team'
                ? 'An explicitly synthetic scorecard showing how performance and outcomes can inform assignment.'
                : section === 'assignment'
                  ? 'A synthetic walkthrough of eligibility, timed acceptance, automatic reroute and capacity-gap escalation.'
                  : 'A simulated audit trail of offers, reroutes and recorded outcomes.'}</p>
          </div>
          <div className="intro-buttons">{section === 'live' ? <><button className="quiet-button" onClick={checkGraph8} disabled={busy}>↻ &nbsp; {busy ? 'Refreshing…' : 'Refresh live data'}</button><button className="signal-button" onClick={() => setSection('assignment')}>Open urgency simulation <span>→</span></button></> : <><button className="quiet-button" onClick={reset}>↺ &nbsp; Reset demo</button><button className="signal-button" onClick={addSignal}><span>＋</span> Simulate buyer signal</button></>}</div>
        </section>

        {section === 'live' && !liveSnapshot && <section className="live-data-card live-connect-state" aria-label="Graph8 connection status">
          <div className="live-data-heading"><div><div className="kicker">GRAPH8 CONNECTION</div><h2>{connection.mode === 'loading' ? 'Connecting to your organization…' : connection.mode === 'demo' ? 'Live data is not configured' : 'Could not load live data'}</h2><p>{connection.mode === 'demo' ? 'Set G8_API_KEY in app/.env and restart the app. The key stays server-side.' : connection.message}</p></div><span className={`live-state live-${connection.mode}`}>{connection.mode === 'loading' ? 'CONNECTING' : connection.mode === 'demo' ? 'DEMO ONLY' : 'READ FAILED'}</span></div>
          <button className="quiet-button" onClick={checkGraph8} disabled={busy}>↻ &nbsp; Retry Graph8 read</button>
        </section>}

        {section === 'live' && liveSnapshot && <section className="live-data-card" aria-label="Live Graph8 workspace">
          <div className="live-data-heading"><div><div className="kicker">CONNECTED GRAPH8 DATA</div><h2>Live organization snapshot</h2><p>Graph8 API data · {liveSnapshot.fetchedAt ? new Date(liveSnapshot.fetchedAt).toLocaleString() : 'latest refresh'}</p></div><span className={`live-state live-${liveSnapshot.mode}`}>{liveSnapshot.mode === 'error' ? 'READ FAILED' : liveSnapshot.mode === 'partial' ? 'PARTIAL READ' : 'LIVE READ'}</span></div>
          <div className="live-data-grid">
            <section className="live-data-column"><div className="live-column-heading"><h3>SDR team summary · 30 days</h3><span>{liveSnapshot.sources.summary.count} metrics</span></div>
              {liveSnapshot.sources.summary.state === 'error' ? <p className="live-empty">{liveSnapshot.sources.summary.message}</p> : Object.entries(liveSnapshot.sources.summary.metrics).length ? <div className="live-metric-list">{orderedLiveMetrics(liveSnapshot.sources.summary.metrics).map(([key, value]) => <div className="live-metric-row" key={key}><span>{liveLabel(key)}</span><b>{liveValue(value, key)}</b></div>)}</div> : <p className="live-empty">Graph8 returned no team summary metrics.</p>}
            </section>
            <section className="live-data-column"><div className="live-column-heading"><h3>Dialer performance</h3><span>{liveSnapshot.sources.dialer.count} metrics</span></div>
              {liveSnapshot.sources.dialer.state === 'error' ? <p className="live-empty">{liveSnapshot.sources.dialer.message}</p> : Object.entries(liveSnapshot.sources.dialer.metrics).length ? <div className="live-metric-list">{orderedLiveMetrics(liveSnapshot.sources.dialer.metrics).map(([key, value]) => <div className="live-metric-row" key={key}><span>{liveLabel(key)}</span><b>{liveValue(value, key)}</b></div>)}</div> : <p className="live-empty">Graph8 returned no dialer metrics for this account.</p>}
            </section>
            <section className="live-data-column"><div className="live-column-heading"><h3>SDR activity trends · 30 days</h3><span>{liveSnapshot.sources.trends.count} periods</span></div>
              {liveSnapshot.sources.trends.state === 'error' ? <p className="live-empty">{liveSnapshot.sources.trends.message}</p> : liveSnapshot.sources.trends.items.length ? liveSnapshot.sources.trends.items.map((trend, index) => <div className="live-record" key={trend.period ?? index}><b>{trend.period ? new Date(trend.period).toLocaleDateString() : `Period ${index + 1}`}</b><div className="live-metrics">{orderedLiveMetrics(trend.metrics).map(([key, value]) => <small key={key}>{liveLabel(key)} <b>{liveValue(value, key)}</b></small>)}</div></div>) : <p className="live-empty">Graph8 returned no activity trend periods.</p>}
            </section>
            <section className="live-data-column"><div className="live-column-heading"><h3>SDR leaderboard</h3><span>{liveSnapshot.sources.sdrs.count} rows</span></div>
              {liveSnapshot.sources.sdrs.state === 'error' ? <p className="live-empty">{liveSnapshot.sources.sdrs.message}</p> : liveSnapshot.sources.sdrs.items.length ? liveSnapshot.sources.sdrs.items.slice(0, 10).map(person => <div className="live-record" key={person.id ?? person.name}><b>{person.name}</b><span>{person.role || 'Graph8 SDR'}</span><div className="live-metrics">{orderedLiveMetrics(person.metrics).map(([key, value]) => <small key={key}>{liveLabel(key)} <b>{liveValue(value, key)}</b></small>)}{Object.keys(person.metrics).length === 0 && <small>No performance metrics in this response</small>}</div></div>) : <p className="live-empty">Graph8 returned no SDR leaderboard rows for this organization. No demo reps are substituted.</p>}
            </section>
            <section className="live-data-column"><div className="live-column-heading"><h3>Per-SDR activity · 30 days</h3><span>{liveSnapshot.sources.activity.count} rows</span></div>
              {liveSnapshot.sources.activity.state === 'error' ? <p className="live-empty">{liveSnapshot.sources.activity.message}</p> : liveSnapshot.sources.activity.items.length ? liveSnapshot.sources.activity.items.slice(0, 10).map(person => <div className="live-record" key={person.id ?? person.name}><b>{person.name}</b><span>{person.role || 'Graph8 SDR'}</span><div className="live-metrics">{orderedLiveMetrics(person.metrics).map(([key, value]) => <small key={key}>{liveLabel(key)} <b>{liveValue(value, key)}</b></small>)}{Object.keys(person.metrics).length === 0 && <small>No activity metrics in this response</small>}</div></div>) : <p className="live-empty">Graph8 returned no per-SDR activity rows. No demo reps are substituted.</p>}
            </section>
            <section className="live-data-column"><div className="live-column-heading"><h3>Unassigned open tasks</h3><span>{liveUnassignedTasks.length} rows</span></div>
              {liveSnapshot.sources.tasks.state === 'error' ? <p className="live-empty">{liveSnapshot.sources.tasks.message}</p> : liveUnassignedTasks.length ? liveUnassignedTasks.slice(0, 10).map(task => {
                const selectedAssigneeId = liveAssigneeByTask[task.id] ?? assignableLiveMembers[0]?.id ?? ''
                return <div className="live-record" key={task.id}>
                  <b>{task.title}</b><span>{task.entityLabel || task.entityType || 'Graph8 task'} · priority {livePriority(task.priority)}</span><small>{task.dueAt ? `Due ${new Date(task.dueAt).toLocaleString()}` : `Graph8 task ${task.id}`}</small>
                  <div className="live-task-actions">{assignableLiveMembers.length && liveSnapshot.taskWritesEnabled ? <>
                    <label>Assign to active SDR<select aria-label={`Choose an SDR for ${task.title}`} value={selectedAssigneeId} onChange={event => setLiveAssigneeByTask(old => ({ ...old, [task.id]: event.target.value }))}>
                      {assignableLiveMembers.map(member => <option key={member.id} value={member.id ?? ''}>{member.name}{member.role ? ` · ${member.role}` : ''}</option>)}
                    </select></label>
                    <button className="live-assign-button" disabled={!selectedAssigneeId || assigningTaskId !== null} onClick={() => { if (selectedAssigneeId) void assignLiveTask(task, selectedAssigneeId) }}>{assigningTaskId === task.id ? 'Assigning…' : 'Assign in Graph8'}</button>
                  </> : <small className="live-empty">{!liveSnapshot.taskWritesEnabled ? 'Live task writes are disabled. Enable them only behind access protection.' : 'Assignment unavailable: no verified active SDR role in this Graph8 roster.'}</small>}</div>
                </div>
              }) : <p className="live-empty">{liveSnapshot.sources.tasks.state === 'empty' ? 'Graph8 returned no open tasks.' : 'No unassigned tasks appeared in the open task rows returned by Graph8.'}</p>}
            </section>
            <section className="live-data-column"><div className="live-column-heading"><h3>Graph8 team roster</h3><span>{liveSnapshot.sources.members.count} rows</span></div>
              {liveSnapshot.sources.members.state === 'error' ? <p className="live-empty">{liveSnapshot.sources.members.message}</p> : liveSnapshot.sources.members.items.length ? liveSnapshot.sources.members.items.slice(0, 10).map(member => <div className="live-record live-member" key={member.id ?? member.name}><b>{member.name}</b><span>{member.role || 'Team member'}</span><small>{member.active === null ? 'Roster status not provided' : member.active ? 'Active roster member · duty/capacity unknown' : 'Inactive roster member'}</small>{member.expertise.length > 0 && <small>Expertise: {member.expertise.join(', ')}</small>}</div>) : <p className="live-empty">Graph8 returned no team member rows.</p>}
            </section>
          </div>
          <div className="live-data-foot">Analytics and roster are read from Graph8. Task writes are {liveSnapshot.taskWritesEnabled ? 'enabled' : 'disabled by default'}; when enabled, assignments require manager confirmation and an active SDR match. On-duty status and capacity are not available here, so timed offers and automatic rerouting remain simulated.</div>
        </section>}

        {section === 'live' && <section className="prospect-search-panel" aria-label="Graph8 global prospect search">
          <div className="prospect-search-heading"><div><div className="kicker">GRAPH8 GLOBAL INDEX</div><h2>Find real prospects</h2><p>Search Graph8’s global B2B index. These prospects are separate from your organization’s SDR activity and CRM records.</p></div><span className="source-pill">ON-DEMAND SEARCH</span></div>
          <form className="prospect-search-form" onSubmit={searchGlobalProspects}>
            <label>Search type<select value={prospectKind} onChange={event => setProspectKind(event.target.value as 'contacts' | 'companies')}><option value="contacts">People by job title</option><option value="companies">Companies by name</option></select></label>
            <label>{prospectKind === 'contacts' ? 'Job title contains' : 'Company name contains'}<input value={prospectQuery} onChange={event => setProspectQuery(event.target.value)} maxLength={120} required minLength={2} placeholder={prospectKind === 'contacts' ? 'e.g. VP Sales' : 'e.g. Acme'} /></label>
            <label>Industry (optional)<input value={prospectIndustry} onChange={event => setProspectIndustry(event.target.value)} maxLength={100} placeholder="e.g. Software" /></label>
            <label>Country (optional)<input value={prospectCountry} onChange={event => setProspectCountry(event.target.value)} maxLength={100} placeholder="e.g. United States" /></label>
            <label>Max results<select value={prospectLimit} onChange={event => setProspectLimit(Number(event.target.value))}><option value={3}>3</option><option value={5}>5</option><option value={10}>10</option></select></label>
            <button className="signal-button prospect-search-button" type="submit" disabled={prospectSearch.status === 'loading' || prospectQuery.trim().length < 2}>{prospectSearch.status === 'loading' ? 'Searching…' : 'Search Graph8'}</button>
          </form>
          <p className="prospect-search-note">Search is user-triggered and limited to 10 results. Graph8 may charge credits per result; DealDispatch does not save or import results.</p>
          <label className="ai-offer-input">Your product or value proposition<input value={outreachOffer} onChange={event => setOutreachOffer(event.target.value)} maxLength={400} placeholder="Describe your offer; edit the DealDispatch example" /></label>
          <p className="ai-privacy-note">Add at least 10 characters about your offer to enable drafting. On click, Gemini receives the prospect’s name, role, company details, description and your offer; email addresses and profile URLs are excluded. Drafts are not sent or saved.</p>
          {prospectSearch.status === 'error' && <p className="prospect-search-message error-message" role="alert">{prospectSearch.message}</p>}
          {prospectSearch.status === 'success' && <>
            <div className="prospect-results-heading"><b>{prospectSearch.count} {prospectSearch.kind === 'contacts' ? 'people' : 'companies'} returned</b><span>Read-only · not imported into your workspace</span></div>
            {prospectSearch.results.length ? <div className="prospect-results-grid">{prospectSearch.results.map((prospect, index) => {
              const prospectKey = `${prospect.name}-${prospect.domain ?? index}`
              const showingAi = aiOutreach.key === prospectKey
              return <article className="prospect-result" key={prospectKey}>
              <div className="prospect-result-title"><b>{prospect.name}</b>{prospect.title && <span>{prospect.title}{prospect.seniority ? ` · ${prospect.seniority}` : ''}</span>}</div>
              {prospect.company && <small>{prospect.company}{prospect.domain ? ` · ${prospect.domain}` : ''}</small>}
              {!prospect.company && prospect.domain && <small>{prospect.domain}</small>}
              {prospect.industry && <small>{prospect.industry}{prospect.employeeCount ? ` · ${prospect.employeeCount} employees` : ''}{prospect.revenue ? ` · ${prospect.revenue}` : ''}</small>}
              {prospect.location && <small>{prospect.location}</small>}
              {prospect.workEmail && <small>{prospect.workEmail}</small>}
              {prospect.description && <p>{prospect.description}</p>}
              {prospect.linkedinUrl && <a href={prospect.linkedinUrl} target="_blank" rel="noreferrer">View LinkedIn profile ↗</a>}
              <button className="ai-draft-button" onClick={() => void generateAiOutreach(prospect, prospectKey)} disabled={aiOutreach.status === 'loading' || outreachOffer.trim().length < 10}>
                {showingAi && aiOutreach.status === 'loading' ? 'Gemini is drafting…' : '✦ Draft outreach with Gemini'}
              </button>
              {showingAi && aiOutreach.status === 'error' && <p className="ai-draft-error" role="alert">{aiOutreach.message}</p>}
              {showingAi && aiOutreach.status === 'success' && aiOutreach.draft && <section className="ai-draft-card" aria-label="Gemini-generated outreach draft">
                <div className="ai-draft-heading"><b>Gemini AI draft</b><span>{aiOutreach.draft.model}</span></div>
                <div className="ai-draft-subject"><small>SUBJECT</small><b>{aiOutreach.draft.subject}</b></div>
                <p className="ai-draft-personalization">{aiOutreach.draft.personalization}</p>
                <p className="ai-draft-body">{aiOutreach.draft.emailBody}</p>
                <div className="ai-draft-question"><small>DISCOVERY QUESTION</small><b>{aiOutreach.draft.discoveryQuestion}</b></div>
                {aiOutreach.draft.evidenceUsed.length > 0 && <div className="ai-evidence"><small>GROUNDED IN GRAPH8 DATA</small>{aiOutreach.draft.evidenceUsed.map(item => <span key={item}>{item}</span>)}</div>}
                {aiOutreach.draft.caveat && <p className="ai-draft-caveat">Review: {aiOutreach.draft.caveat}</p>}
                <button className="ai-copy-button" onClick={() => void copyAiOutreach(aiOutreach.draft!)}>Copy draft</button>
              </section>}
            </article>})}</div> : <p className="live-empty">No matches for these filters. Try a broader job title, industry, or country.</p>}
          </>}
        </section>}

        {section === 'live' && <section className="demo-preview-panel" aria-label="Synthetic demo data preview">
          <div className="demo-preview-heading">
            <div><div className="kicker">SYNTHETIC DEMO DATA · SEPARATE FROM GRAPH8</div><h2>See the complete DealDispatch workflow</h2><p>Fictional SDRs, sample buyer signals and illustrative scores make the four-step flow usable even when your organization has no activity rows.</p></div>
            <span className="source-pill">NOT LIVE CUSTOMER DATA</span>
          </div>
          <div className="demo-preview-stats">
            <div><b>{data.people.length}</b><span>sample SDRs</span></div>
            <div><b>{data.opportunities.length}</b><span>sample opportunities</span></div>
            <div><b>{capacityCount}</b><span>SDRs currently eligible</span></div>
            <div><b>{compactCash(teamPipeline)}</b><span>illustrative pipeline</span></div>
          </div>
          <div className="demo-preview-records">{data.opportunities.slice(0, 3).map(opportunity => <article className="demo-preview-record" key={opportunity.id}>
            <div><span className={`urgency-tag urgency-${opportunity.urgency}`}>{opportunity.urgency.toUpperCase()}</span><span className={`state state-${opportunity.state}`}>{opportunity.state === 'new' ? 'UNASSIGNED' : opportunity.state === 'offered' ? 'OFFER PENDING' : opportunity.state === 'owned' ? opportunity.outcome ? 'CLOSED' : 'ACCEPTED' : 'COVERAGE GAP'}</span></div>
            <b>{opportunity.company}</b><small>{opportunity.signal}</small><strong>{cash(opportunity.value)} <span>illustrative value</span></strong>
          </article>)}</div>
          <div className="demo-preview-actions"><span>Demo actions update only this browser’s sample scorecard and audit trail.</span><div><button className="quiet-button" onClick={() => setSection('team')}>Open demo scorecard</button><button className="signal-button" onClick={reset}>Reset &amp; run four-step demo <span>→</span></button></div></div>
        </section>}

        {section === 'team' && <>
          <section className="metrics team-metrics">
            <div className="metric"><span className="metric-icon coral">↗</span><div><small>Qualified handoffs</small><strong>{teamQualified}</strong><span className="metric-note">30-day team total</span></div></div>
            <div className="metric"><span className="metric-icon blue">＄</span><div><small>Qualified pipeline sourced</small><strong>{compactCash(teamPipeline)}</strong><span className="metric-note">Attributed demo results</span></div></div>
            <div className="metric"><span className="metric-icon violet">✳</span><div><small>Average call grade</small><strong>{meanCallGrade}<small className="score-suffix"> / 100</small></strong><span className="metric-note">Synthetic sample only</span></div></div>
            <div className="metric"><span className="metric-icon purple">♙</span><div><small>Assignable work capacity</small><strong>{availableSlots}</strong><span className="metric-note">Across {capacityCount} available SDRs</span></div></div>
          </section>

          <div className="workspace-head"><div><h2>SDR performance</h2><p>30-day view · outcomes and quality determine rank; activity volume is context.</p></div><span className="period-pill">LAST 30 DAYS</span></div>
          <section className="team-grid">
            <div className="leaderboard-card">
                <div className="leaderboard-head"><div><div className="kicker">OUTCOME SCORECARD</div><h3>Who is creating qualified progress?</h3></div><span className="source-pill">SYNTHETIC DEMO DATA</span></div>
              <div className="table-scroll"><table className="team-table"><thead><tr><th>RANK / SDR</th><th>IMPACT</th><th>QUALIFIED<br/>HANDOFFS</th><th>SOURCED<br/>PIPELINE</th><th>CALL<br/>GRADE</th><th>OPEN<br/>WORK</th></tr></thead>
                <tbody>{rankedPeople.map((person, index) => {
                  const score = performanceScore(person)
                  const active = focusedPerson?.id === person.id
                  return <tr key={person.id} className={active ? 'selected-rep' : ''}>
                    <td><button className="rep-cell" onClick={() => setFocusedPersonId(person.id)}><span className={`rank-number ${index === 0 ? 'rank-first' : ''}`}>{String(index + 1).padStart(2, '0')}</span><span className={`person-avatar ${person.source === 'Contracted talent' ? 'avatar-blue' : 'avatar-coral'}`}>{initials(person.name)}</span><span className="rep-meta"><b>{person.name}</b><small>{person.role} · {person.source}</small></span></button></td>
                    <td><div className="impact-value">{score}<small> / 100</small></div><div className="impact-bar"><i style={{ width: `${score}%` }}/></div><small className="confidence-label">{confidence(person)}</small></td>
                    <td><strong>{person.metrics.qualifiedHandoffs}</strong><small className="cell-sub">of {person.metrics.handoffGoal} goal</small></td>
                    <td><strong>{compactCash(person.metrics.qualifiedPipeline)}</strong><small className="cell-sub">qualified</small></td>
                    <td><strong>{person.metrics.callGrade}</strong><small className="cell-sub">Synthetic sample</small></td>
                    <td><strong>{person.load}<small className="load-divider"> / </small>{person.capacity}</strong><small className={`cell-sub ${!person.activeContract ? 'unavailable' : person.onDuty ? 'available' : ''}`}>{!person.activeContract ? 'No active contract' : person.onDuty ? 'On duty' : 'Off duty'}</small></td>
                  </tr>
                })}</tbody></table></div>
              <div className="leaderboard-foot"><span>Calls placed: {data.people.reduce((sum, person) => sum + person.metrics.dials, 0).toLocaleString()} across this team</span><span>Displayed for context · excluded from impact score</span></div>
            </div>

            <aside className="manager-panel">
              <div className="panel-label">MANAGER VIEW <span>30D</span></div>
              {focusedPerson && <>
                <div className="focus-person"><div className={`person-avatar ${focusedPerson.source === 'Contracted talent' ? 'avatar-blue' : 'avatar-coral'}`}>{initials(focusedPerson.name)}</div><div><b>{focusedPerson.name}</b><small>{focusedPerson.role} · rank #{rankedPeople.findIndex(person => person.id === focusedPerson.id) + 1}</small></div><strong>{performanceScore(focusedPerson)}<small>IMPACT</small></strong></div>
                <div className="focus-stats"><div><small>Qualified meetings</small><b>{focusedPerson.metrics.meetingsBooked}</b></div><div><small>Follow-through</small><b>{focusedPerson.metrics.followThrough}%</b></div><div><small>First touch in SLA</small><b>{focusedPerson.metrics.firstTouchSla}%</b></div></div>
                <div className="coach-note"><div className="coach-note-icon">✳</div><div><b>{coachFocus && coachFocus.value >= 90 ? 'Strength to repeat' : 'Manager focus'}</b><p>{coachFocus ? `${coachFocus.label} is at ${Math.round(coachFocus.value)}% of its benchmark. Use call grades and follow-up evidence to coach the next batch, not a raw activity target.` : 'More outcomes are needed before suggesting a coaching focus.'}</p></div></div>
                <div className="confidence-note"><span>◉</span> {focusedPerson.metrics.completedAssignments} completed assignments in sample · {confidence(focusedPerson).toLowerCase()}</div>
              </>}
              <div className="next-work-card"><div className="panel-label">NEXT UNASSIGNED OPPORTUNITY</div><b>{nextWork?.company ?? 'No open buyer work'}</b><p>{nextWork ? `${nextWork.segment} · ${cash(nextWork.value)} estimated` : 'Add a signal to see the next fit.'}</p><div className="next-work-match">{topCandidate ? <><span className="tiny-face">{initials(topCandidate.name)}</span><span>Best current fit <b>{topCandidate.name}</b></span><strong>{topCandidateScore}</strong></> : <span>No eligible SDR has capacity</span>}</div><button onClick={() => { if (nextWork) setSelectedId(nextWork.id); setSection('assignment') }}>Review work assignment <span>→</span></button></div>
            </aside>
          </section>

          <section className="score-method"><div className="method-heading"><span className="method-icon">◎</span><div><b>How the demo impact score works</b><p>Outcome-first, with sample size and evidence visible to the manager.</p></div></div><div className="method-chips"><span><b>35%</b> qualified handoffs vs goal</span><span><b>25%</b> call grade</span><span><b>20%</b> meetings per connection</span><span><b>10%</b> follow-through</span><span><b>10%</b> first-touch SLA</span></div><div className="method-note">Dials are visible but do not raise rank. Compare like roles, segments and lead sources; keep a human manager in control.</div></section>
        </>}

        {section === 'assignment' && <>
          <section className="metrics assignment-metrics">
            <div className="metric"><span className="metric-icon coral">↗</span><div><small>Unassigned buyer work</small><strong>{unassignedCount.toString().padStart(2, '0')}</strong><span className="metric-note">Needs an SDR owner</span></div></div>
            <div className="metric"><span className="metric-icon blue">✓</span><div><small>Assigned and in progress</small><strong>{assignedCount.toString().padStart(2, '0')}</strong><span className="metric-note">Tracked in this demo</span></div></div>
            <div className="metric"><span className="metric-icon violet">♙</span><div><small>SDRs with capacity</small><strong>{capacityCount.toString().padStart(2, '0')}</strong><span className="metric-note">Eligible and on duty</span></div></div>
            <div className="metric"><span className="metric-icon purple">▤</span><div><small>Open assignment slots</small><strong>{availableSlots.toString().padStart(2, '0')}</strong><span className="metric-note">Current eligible pool</span></div></div>
          </section>

          <div className="workspace-head"><div><h2>Buyer work queue</h2><p>All required skills, active engagement, on-duty status and available capacity must match before an offer.</p></div><div className="dispatch-admin"><label>ACCEPTANCE WINDOW<select value={offerWindowSeconds} onChange={event => setOfferWindowSeconds(Number(event.target.value))}><option value={15}>15 seconds</option><option value={30}>30 seconds</option><option value={45}>45 seconds</option><option value={60}>60 seconds</option></select></label><label>QUEUE VIEW<select aria-label="Filter buyer work" value={filter} onChange={event => changeQueueFilter(event.target.value as QueueFilter)}><option value="all">All work ({data.opportunities.length})</option><option value="unassigned">Needs action ({unassignedCount})</option><option value="assigned">Assigned ({data.opportunities.filter(item => item.state === 'owned').length})</option><option value="coverage">Coverage gaps ({coverageGapCount})</option></select></label></div></div>
          <section className="board"><div className="queue"><div className="queue-head"><span>BUYER WORK</span><span className="live"><i/> DEMO QUEUE</span></div><div className="queue-items">{visible.map(opportunity => {
            const owner = data.people.find(person => person.id === opportunity.owner)
            const offerPerson = data.people.find(person => person.id === opportunity.offeredTo)
            return <button key={opportunity.id} className={`opportunity ${opportunity.id === selected?.id ? 'opp-selected' : ''}`} onClick={() => setSelectedId(opportunity.id)}>
              <div className="opp-top"><span className={`state state-${opportunity.state}`}>{opportunity.state === 'new' ? 'UNASSIGNED' : opportunity.state === 'offered' ? 'OFFER PENDING' : opportunity.state === 'owned' ? opportunity.outcome ? 'OUTCOME RECORDED' : 'ACCEPTED' : 'CAPACITY GAP'}</span><span className={`urgency-tag urgency-${opportunity.urgency}`}>{opportunity.urgency.toUpperCase()}</span><span className="age-label">{addMinutes(0, opportunity.minutesOld)}</span></div>
              <div className="opp-company">{opportunity.company}</div><div className="opp-signal"><i>↗</i>{opportunity.signal}</div>
              <div className="opp-bottom"><strong>{cash(opportunity.value)} <small>estimated value</small></strong><span>{owner ? <><span className="tiny-face">{initials(owner.name)}</span>{owner.name}</> : offerPerson ? `Waiting on ${offerPerson.name}` : `${opportunity.segment} · ${opportunity.dispatches} offers`}</span></div>
            </button>
          })}{visible.length === 0 && <div className="nothing">No work matches this filter.</div>}</div><div className="queue-foot"><span><i/> Synthetic urgency scenario</span><button onClick={addSignal}>＋ Add signal</button></div></div>

            <div className="detail">{selected ? <>
              <div className="detail-head"><div><div className="kicker">BUYER WORK BRIEF <span>·</span> {selected.id.toUpperCase()}</div><h2>{selected.company}</h2></div><span className={`state state-${selected.state}`}>{selected.state === 'new' ? 'UNASSIGNED' : selected.state === 'offered' ? 'OFFER PENDING' : selected.state === 'owned' ? 'ACCEPTED' : 'CAPACITY GAP'}</span></div>
              <div className="value-strip"><span>ESTIMATED OPPORTUNITY</span><strong>{cash(selected.value)}</strong><span className="value-divider"/><span>SEGMENT <b className="priority">{selected.segment}</b></span><span className="source">SYNTHETIC DEMO</span></div>
              <div className="signal-summary"><div className="signal-icon">↗</div><div><b>{selected.signal}</b><p>{selected.evidence}</p></div></div>
              <div className="required"><span>REQUIRED EXPERTISE</span>{selected.required.map(skill => <span className="skill-pill" key={skill}>{skill}</span>)}</div>
              <div className="rule"/>

              {selected.state === 'offered' ? (() => {
                const offerPerson = data.people.find(person => person.id === selected.offeredTo)
                const remaining = Math.max(0, Math.ceil(((selected.expiresAt ?? now) - now) / 1000))
                return <div className="panic-offer-card">
                  <div className="panic-offer-heading"><div><span className="panic-kicker">⚡ URGENT OFFER · WAITING FOR ACCEPTANCE</span><h3>{offerPerson?.name ?? 'Assigned SDR'} has the next {remaining}s</h3></div><div className="panic-countdown">00:{String(remaining).padStart(2, '0')}</div></div>
                  <p>If this offer is declined or expires, the next eligible rep gets it automatically. This demo simulates the rep response and sends no notification.</p>
                  <div className="panic-offer-actions"><button className="accept-button" disabled={remaining === 0 || !offerPerson} onClick={() => acceptOffer(selected)}>✓ &nbsp; Accept offer</button><button className="decline-button" onClick={() => rerouteOffer(selected)}>Decline · reroute now</button></div>
                </div>
              })() : selected.state === 'owned' ? <>
                {(() => {
                  const owner = data.people.find(person => person.id === selected.owner)
                  return <div className="owned-card assignment-owner"><span className="owned-check">✓</span><div><b>{owner?.name} accepted and owns this work.</b><p>The acceptance is recorded in the demo audit trail.</p></div></div>
                })()}
                {selected.outcome ? <div className="outcome-confirmation"><b>{selected.outcome === 'qualified' ? 'Qualified handoff recorded' : 'Closed as not qualified'}</b><span>{selected.outcome === 'qualified' ? `${cash(selected.value)} added to sourced pipeline in the demo scorecard.` : 'The segment conversion sample was updated and open capacity released.'}</span></div> : <div className="outcome-entry"><div><div className="kicker">CLOSE THE FEEDBACK LOOP</div><b>What happened after the SDR worked it?</b><p>Record a qualified handoff or close it as not qualified. The sample ranking and same-segment assignment fit update immediately.</p></div><button className="qualified-button" onClick={() => recordOutcome(selected, 'qualified')}>✓ &nbsp; Qualified handoff</button><button className="not-qualified-button" onClick={() => recordOutcome(selected, 'not_qualified')}>Close · not qualified</button></div>}
              </> : !rankedCandidates.some(item => item.canTake) ? <div className="gap-card"><span>!</span><div><b>CAPACITY GAP · no eligible rep can accept</b><p>Qualified, on-duty reps are at capacity, lack a required skill, or have already passed. Record this gap for manager review; marketplace coverage is not contacted automatically.</p><button className="quiet-button" disabled={selected.state === 'gap'} onClick={() => escalateCoverageGap(selected)}>{selected.state === 'gap' ? 'Gap recorded for review' : 'Escalate coverage gap'}</button></div></div>
              : <div className="match-panel"><div className="match-heading"><div><div className="kicker">RANKED FOR THIS OPPORTUNITY</div><h3>Who should receive the offer?</h3></div><span>{rankedCandidates.filter(item => item.canTake).length} eligible</span></div>
                <div className="match-list">{rankedCandidates.map(({ person, score, canTake }, index) => {
                  const cohort = person.metrics.segmentResults[selected.segment]
                  const cohortRate = cohort ? Math.round(cohort.qualified / Math.max(cohort.completed, 1) * 100) : 0
                  const missingSkills = selected.required.filter(skill => !person.skills.includes(skill))
                  return <div key={person.id} className={`match-person assignment-candidate ${!canTake ? 'person-muted' : ''}`}>
                    <div className={`person-avatar ${person.source === 'Contracted talent' ? 'avatar-blue' : 'avatar-coral'}`}>{initials(person.name)}</div>
                    <div className="person-main"><div className="person-name">{person.name}{index === 0 && canTake && <span className="best-fit">TOP FIT</span>}</div><span>{person.role} · {person.source}</span><small className={canTake ? 'available' : 'unavailable'}><i/>{!person.activeContract ? 'No active engagement' : !person.onDuty ? 'Off duty' : person.load >= person.capacity ? 'At capacity' : selected.tried.includes(person.id) ? 'Already passed on this opportunity' : missingSkills.length ? `Missing skills: ${missingSkills.join(', ')}` : `${person.capacity - person.load} open slots · ${cohortRate}% same-segment history`}</small></div>
                    <div className="match-score">{score}<small>FIT</small></div><button className="assign-person-button" disabled={!canTake} onClick={() => offerTo(selected, person.id)}>{canTake ? 'Offer' : '—'}</button>
                  </div>
                })}</div>
                <div className="route-logic"><span>OFFER ELIGIBILITY</span><p><b>35%</b> same-segment outcomes · <b>25%</b> expertise · <b>20%</b> call grade · <b>10%</b> capacity · <b>10%</b> follow-through.<br/>Only active, contracted, on-duty SDRs with capacity and matching skills enter the offer order.</p></div>
                <button className="dispatch-button panic-dispatch" onClick={() => topCandidate && offerTo(selected, topCandidate.id)} disabled={!topCandidate}>⚡ Open timed offer to best fit <span>→</span></button>
              </div>}
              <div className="detail-foot"><span>◉ &nbsp; Demo offers are simulated · no messages sent</span><span>{selected.dispatches} offer{selected.dispatches === 1 ? '' : 's'} opened</span></div>
            </> : <div className="detail-empty"><b>No buyer work in this view</b><span>Choose another queue filter or add a sample signal.</span></div>}</div>
          </section>
          {selected && <section className="workflow-steps" aria-label="Four-step urgent dispatch workflow"><div className="workflow-heading"><div><div className="kicker">DEALDISPATCH PANIC FLOW</div><h3>Four steps from urgency to ownership</h3></div><span>STEP {workflowStep} OF 4</span></div><div className="workflow-track">
            {[['Signal detected', 'Sample buyer event enters the queue.'], ['Rank qualified SDRs', 'Every required skill plus duty and capacity must match.'], ['Timed offer', 'The rep accepts, declines, or lets it expire.'], ['Resolve the handoff', 'Accept, reroute to the next rep, or flag a coverage gap.']].map(([title, detail], index) => <div key={title} className={`workflow-step ${workflowStep > index + 1 ? 'step-complete' : workflowStep === index + 1 ? 'step-current' : ''}`}><span>{workflowStep > index + 1 ? '✓' : `0${index + 1}`}</span><div><b>{title}</b><small>{detail}</small></div></div>)}
          </div><div className="workflow-admin"><span>Manager controls</span><b>{offerWindowSeconds}s acceptance window</b><i/> hard eligibility gates <i/> reroute on decline or timeout <i/> capacity-gap escalation</div></section>}
          <section className="explain"><div className="explain-icon">◎</div><div><b>Urgency, acceptance and reroute complete the handoff loop</b><p>Graph8 already has routing and assignment tools. DealDispatch demonstrates a time-bound acceptance decision and automatic next-person reroute; global uniqueness and feature-gap status still need Graph8 confirmation.</p></div><button onClick={() => setSection('team')}>View SDR ranking →</button></section>
        </>}

        {section === 'activity' && <>
          <div className="workspace-head"><div><h2>Assignment and outcome trail</h2><p>See why work was assigned and what result changed the SDR scorecard.</p></div><button className="quiet-button" onClick={reset}>↺ Reset activity</button></div>
          <section className="activity-board"><div className="activity-top"><span>DEMO AUDIT TRAIL</span><span>{data.log.length} events · newest first</span></div>{data.log.map((item, index) => {
            const opportunity = data.opportunities.find(entry => entry.id === item.opportunity)
            const icon = item.kind === 'outcome' ? '✓' : item.kind === 'gap' ? '!' : item.kind === 'assigned' ? '↗' : '◎'
            return <div className="activity-row" key={item.id}><span className={`activity-icon act-${item.kind}`}>{icon}</span><div className="activity-copy"><b>{item.text}</b><span>{opportunity?.company ?? 'Opportunity'}{item.person ? ` · ${item.person}` : ''}</span></div><time>{clock(item.time)}</time><span className="trail-index">{String(data.log.length - index).padStart(2, '0')}</span></div>
          })}</section>
        </>}

        <footer><span>DealDispatch <b>·</b> SDR performance linked to better work assignment</span><span>{section === 'live' ? 'Graph8 task owners change only after manager confirmation; urgent rerouting stays simulated.' : 'All SDRs, scores, buyer work and outcomes here are synthetic demo data.'}</span></footer>
      </div>
    </main>
    {toast && <div className="toast" role="status"><span>✓</span>{toast}<button aria-label="Dismiss message" onClick={() => setToast('')}>×</button></div>}
  </div>
}
