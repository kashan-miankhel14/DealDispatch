export type Source = 'Internal team' | 'Contracted talent'
export type SegmentResult = { qualified: number; completed: number }
export type RepMetrics = {
  dials: number
  connections: number
  meetingsBooked: number
  qualifiedHandoffs: number
  handoffGoal: number
  completedAssignments: number
  qualifiedPipeline: number
  callGrade: number
  followThrough: number
  firstTouchSla: number
  segmentResults: Record<string, SegmentResult>
}
export type Person = {
  id: string
  name: string
  role: string
  source: Source
  skills: string[]
  segments: string[]
  metrics: RepMetrics
  load: number
  capacity: number
  onDuty: boolean
  activeContract: boolean
  response: string
}
export type Opportunity = {
  id: string
  company: string
  value: number
  signal: string
  evidence: string
  segment: string
  required: string[]
  minutesOld: number
  state: 'new' | 'offered' | 'owned' | 'gap'
  urgency: 'critical' | 'high'
  tried: string[]
  owner?: string
  offeredTo?: string
  outcome?: 'qualified' | 'not_qualified'
  expiresAt?: number
  dispatches: number
}
export type Log = {
  id: string
  time: number
  opportunity: string
  text: string
  person?: string
  kind: 'signal' | 'offered' | 'accepted' | 'declined' | 'expired' | 'rerouted' | 'assigned' | 'gap' | 'outcome'
}
export type DemoState = { people: Person[]; opportunities: Opportunity[]; log: Log[] }
export type QueueFilter = 'all' | 'unassigned' | 'assigned' | 'coverage'
export type DemoTeam = { id: string; name: string; managerName: string; focus: string; memberIds: string[] }

export const demoTeams: DemoTeam[] = [
  { id: 'enterprise', name: 'Enterprise & Technical', managerName: 'Avery Brooks', focus: 'Enterprise SaaS · technical evaluation', memberIds: ['maya', 'noah'] },
  { id: 'fintech', name: 'Fintech & Strategic', managerName: 'Jordan Reed', focus: 'Fintech · enterprise accounts', memberIds: ['samir', 'ria'] },
  { id: 'commercial', name: 'SaaS Outbound', managerName: 'Taylor Morgan', focus: 'SaaS · outbound prospecting', memberIds: ['elena', 'jules'] },
]

export function matchesQueueFilter(opportunity: Opportunity, filter: QueueFilter): boolean {
  if (filter === 'unassigned') return opportunity.state !== 'owned'
  if (filter === 'assigned') return opportunity.state === 'owned'
  if (filter === 'coverage') return opportunity.state === 'gap'
  return true
}

export const demoSeed: DemoState = {
  people: [
    {
      id: 'maya', name: 'Maya Chen', role: 'Enterprise SDR', source: 'Internal team',
      skills: ['Enterprise', 'Technical evaluation', 'SaaS'], segments: ['Enterprise SaaS', 'Technical buying'],
      metrics: { dials: 215, connections: 68, meetingsBooked: 14, qualifiedHandoffs: 12, handoffGoal: 13, completedAssignments: 31, qualifiedPipeline: 420000, callGrade: 91, followThrough: 96, firstTouchSla: 92, segmentResults: { 'Enterprise SaaS': { qualified: 10, completed: 23 }, 'Technical buying': { qualified: 7, completed: 16 } } },
      load: 2, capacity: 4, onDuty: true, activeContract: true, response: 'median first touch 4 min',
    },
    {
      id: 'samir', name: 'Samir Khan', role: 'Fintech SDR', source: 'Internal team',
      skills: ['Enterprise', 'Negotiation', 'Fintech'], segments: ['Fintech', 'Enterprise SaaS'],
      metrics: { dials: 248, connections: 74, meetingsBooked: 16, qualifiedHandoffs: 11, handoffGoal: 13, completedAssignments: 34, qualifiedPipeline: 385000, callGrade: 87, followThrough: 89, firstTouchSla: 88, segmentResults: { Fintech: { qualified: 9, completed: 22 }, 'Enterprise SaaS': { qualified: 6, completed: 22 } } },
      load: 1, capacity: 3, onDuty: true, activeContract: true, response: 'median first touch 7 min',
    },
    {
      id: 'elena', name: 'Elena Torres', role: 'SaaS SDR', source: 'Internal team',
      skills: ['Enterprise', 'SaaS', 'Technical evaluation'], segments: ['Enterprise SaaS', 'Technical buying'],
      metrics: { dials: 190, connections: 61, meetingsBooked: 15, qualifiedHandoffs: 10, handoffGoal: 11, completedAssignments: 26, qualifiedPipeline: 346000, callGrade: 94, followThrough: 93, firstTouchSla: 97, segmentResults: { 'Enterprise SaaS': { qualified: 8, completed: 18 }, 'Technical buying': { qualified: 6, completed: 15 } } },
      load: 2, capacity: 3, onDuty: false, activeContract: true, response: 'off duty · next shift 9:00',
    },
    {
      id: 'noah', name: 'Noah Williams', role: 'Technical SDR', source: 'Contracted talent',
      skills: ['Technical evaluation', 'AI workflows', 'Enterprise'], segments: ['Enterprise SaaS', 'Technical buying'],
      metrics: { dials: 205, connections: 66, meetingsBooked: 17, qualifiedHandoffs: 12, handoffGoal: 12, completedAssignments: 30, qualifiedPipeline: 402000, callGrade: 89, followThrough: 92, firstTouchSla: 95, segmentResults: { 'Enterprise SaaS': { qualified: 9, completed: 25 }, 'Technical buying': { qualified: 11, completed: 24 } } },
      load: 0, capacity: 2, onDuty: true, activeContract: true, response: 'median first touch 5 min',
    },
    {
      id: 'jules', name: 'Jules Okafor', role: 'Outbound SDR', source: 'Contracted talent',
      skills: ['Prospecting', 'SaaS'], segments: ['SaaS', 'Enterprise SaaS'],
      metrics: { dials: 220, connections: 58, meetingsBooked: 9, qualifiedHandoffs: 7, handoffGoal: 11, completedAssignments: 29, qualifiedPipeline: 194000, callGrade: 82, followThrough: 79, firstTouchSla: 81, segmentResults: { 'Enterprise SaaS': { qualified: 4, completed: 23 }, SaaS: { qualified: 6, completed: 19 } } },
      load: 0, capacity: 2, onDuty: true, activeContract: true, response: 'median first touch 12 min',
    },
    {
      id: 'ria', name: 'Ria Patel', role: 'Enterprise SDR', source: 'Contracted talent',
      skills: ['Enterprise', 'Negotiation', 'Fintech'], segments: ['Fintech', 'Enterprise SaaS'],
      metrics: { dials: 176, connections: 59, meetingsBooked: 15, qualifiedHandoffs: 12, handoffGoal: 12, completedAssignments: 28, qualifiedPipeline: 445000, callGrade: 93, followThrough: 95, firstTouchSla: 94, segmentResults: { Fintech: { qualified: 10, completed: 21 }, 'Enterprise SaaS': { qualified: 9, completed: 21 } } },
      load: 0, capacity: 2, onDuty: true, activeContract: false, response: 'no active engagement',
    },
  ],
  opportunities: [
    { id: 'opp-1', company: 'Northstar Robotics', value: 148000, signal: 'Technical evaluation requested', evidence: 'The buying team asked for an architecture review after returning to the product and pricing pages.', segment: 'Enterprise SaaS', required: ['Technical evaluation', 'Enterprise'], minutesOld: 3, state: 'new', urgency: 'critical', tried: [], dispatches: 0 },
    { id: 'opp-2', company: 'Meridian Cloud', value: 92000, signal: 'Buying committee expanded', evidence: 'Two new directors joined an active evaluation this morning; the account has no assigned SDR task.', segment: 'Enterprise SaaS', required: ['Enterprise', 'SaaS'], minutesOld: 12, state: 'new', urgency: 'high', tried: [], dispatches: 0 },
    { id: 'opp-3', company: 'Cobalt Payments', value: 67000, signal: 'Technical objection raised', evidence: 'A prospect paused the evaluation on a data-residency question that needs a relevant specialist.', segment: 'Fintech', required: ['Technical evaluation', 'Fintech'], minutesOld: 21, state: 'new', urgency: 'critical', tried: [], dispatches: 0 },
  ],
  log: [
    { id: 'init-1', time: Date.now() - 21 * 60000, opportunity: 'opp-3', text: 'Urgent buying signal detected · synthetic demo event', kind: 'signal' },
    { id: 'init-2', time: Date.now() - 12 * 60000, opportunity: 'opp-2', text: 'Buying committee signal detected · synthetic demo event', kind: 'signal' },
    { id: 'init-3', time: Date.now() - 3 * 60000, opportunity: 'opp-1', text: 'Technical evaluation signal detected · synthetic demo event', kind: 'signal' },
  ],
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value))

export function performanceScore(person: Person): number {
  const metrics = person.metrics
  const targetAttainment = clamp(metrics.qualifiedHandoffs / Math.max(metrics.handoffGoal, 1) * 100)
  const meetingConversion = clamp(metrics.meetingsBooked / Math.max(metrics.connections, 1) / 0.3 * 100)
  return Math.round(targetAttainment * 0.35 + metrics.callGrade * 0.25 + meetingConversion * 0.2 + metrics.followThrough * 0.1 + metrics.firstTouchSla * 0.1)
}

export function candidateRank(person: Person, opportunity: Opportunity): number {
  const required = Math.max(opportunity.required.length, 1)
  const skillFit = opportunity.required.filter(skill => person.skills.includes(skill)).length / required * 100
  const segmentResult = person.metrics.segmentResults[opportunity.segment]
  const overallRate = person.metrics.qualifiedHandoffs / Math.max(person.metrics.completedAssignments, 1)
  const cohortRate = segmentResult
    ? (segmentResult.qualified + overallRate * 5) / (segmentResult.completed + 5)
    : overallRate
  const segmentOutcome = clamp(cohortRate * 200)
  const headroom = clamp((person.capacity - person.load) / Math.max(person.capacity, 1) * 100)
  const reliability = (person.metrics.followThrough + person.metrics.firstTouchSla) / 2
  return Math.round(segmentOutcome * 0.35 + skillFit * 0.25 + person.metrics.callGrade * 0.2 + headroom * 0.1 + reliability * 0.1)
}

export function eligible(person: Person, opportunity: Opportunity): boolean {
  const skillMatch = opportunity.required.length > 0 && opportunity.required.every(skill => person.skills.includes(skill))
  return person.activeContract && person.onDuty && person.load < person.capacity && !opportunity.tried.includes(person.id) && skillMatch
}

export function chooseNext(people: Person[], opportunity: Opportunity): Person | undefined {
  return people.filter(person => eligible(person, opportunity))
    .sort((a, b) => candidateRank(b, opportunity) - candidateRank(a, opportunity) || a.name.localeCompare(b.name))[0]
}

export function addMinutes(_referenceTime: number, minutes: number): string {
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-minutes, 'minute')
}

export function makeLog(opportunity: Opportunity, text: string, kind: Log['kind'], person?: Person): Log {
  return { id: crypto.randomUUID(), time: Date.now(), opportunity: opportunity.id, text, person: person?.name, kind }
}
