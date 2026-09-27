# DealDispatch

**DealDispatch is a prototype for a time-critical SDR handoff.** The use-case hypothesis: when a qualified buyer signal needs a human response, make one explicit, time-bound offer to an eligible SDR; if they decline or do not respond, try the next eligible person and expose an uncovered-work gap to the manager. This is meant to reduce unowned hot work and time-to-first-human-touch—not to replace Graph8's CRM, routing, analytics, or sales agents.

The timed acceptance/reroute loop is a browser simulation, not a live Graph8 feature, and its uniqueness is **not confirmed**. Graph8 already documents SDR analytics, lead/task assignment, routing/workflows, next-best actions, and AI sales agents. DealDispatch currently reads selected Graph8 data, can search the Graph8 global prospect index, and can optionally use Gemini to prepare a human-reviewed SDR pack. Those are integrations/demo capabilities, not a defensible moat. See [the demo pitch and feature boundaries](docs/DEMO_PITCH.md).

## Product gap still needs validation

Graph8 already has SDR Analytics, dialer analytics, call grading, leaderboards and custom scores, per-rep goals, next-best actions, meeting routing, lead/task ownership, weighted round-robin workflow routing, and AI sales agents. A new ranking dashboard, outreach copilot, or generic dispatcher would overlap. The proposed time-bound acceptance-and-reroute loop may also be achievable through Graph8's configurable workflows. Ask the Graph8 product owner before calling it new. See the [full SDK/MCP audit](docs/graph8-sdr-sdk-mcp-audit.md).

## Demo status

- The React app has a team scorecard, per-work fit ranking, configurable acceptance timer, simulated accept/decline/timeout responses, automatic rerouting, capacity-gap escalation, outcome capture, and an audit trail.
- A new Analytics & charts view separates actual Graph8 numeric trends/leaderboard rows from a synthetic activity funnel and pipeline comparison; missing live rows are not filled with sample data.
- The app opens on a live Graph8 workspace with the SDR leaderboard, per-SDR activity, team summary/trends, dialer performance, open tasks, and roster. The live work-rescue queue includes assigned and unassigned tasks, ranks overdue/due-soon/high-priority/stale work first, and requires manager confirmation for any assignment.
- The live global prospect search can generate a full Gemini SDR prep pack from returned Graph8 facts. The server uses structured output, verifies cited evidence IDs against supplied fields, excludes email/profile URLs, and never sends the pack. `GEMINI_API_KEY` is server-only; the route is off unless explicitly enabled.
- The scorecard and four-step urgency simulator are separate, explicitly synthetic demos. Live leaderboard metrics do not become assignment eligibility: the API data verified for this org does not provide usable SDR rows, on-duty status, or workload capacity.
- The synthetic demo now includes an explicit three-manager/six-SDR reporting tree, team focus and workload alongside the scorecard. It is fictional, and the live-empty screen links directly to the demo instead of filling Graph8 panels with invented rows.
- The four-step urgent offer, response, decline/timeout reroute, gap escalation, and outcome capture remain a browser simulation. They do not send notifications or write offer/outcome state to Graph8.
- Live reads require a server key with `analytics:read`, `tasks:read`, and `team:read`; the explicit task assignment additionally requires `tasks:write`. The configured organization returned six summary metrics, 17 dialer metrics, six trend periods, one team member, zero leaderboard rows, zero per-SDR activity rows, and zero open tasks, so a real assignment cannot yet be exercised against that organization.
- Prior research reported a Graph8 MCP connection with two organizations. No Graph8 MCP tool is exposed in this Codex turn, so that connection and its active organization could not be verified here.
- The live organization currently provides no verified reporting hierarchy, on-duty state, or per-rep capacity through the app's selected endpoints. The app must not claim hierarchy-aware dispatch until Graph8 exposes those fields and they are mapped.

## The manager workflow

1. Detect an urgent, **unowned** work item and show its signal and urgency.
2. Rank eligible SDRs using relevant outcomes, skills, and capacity gates; open an offer for a manager-configured acceptance window.
3. Require explicit acceptance. A decline or timeout automatically offers the work to the next eligible SDR.
4. Record accepted ownership or raise a visible capacity gap for manager review; capture the eventual outcome in the audit trail.

The app's sample score weights and records are fictional. Do not treat them as Graph8's algorithm or validated benchmarks.

## Score definitions in the prototype

The demo impact index uses qualified handoffs vs target (35%), sample call grade (25%), meeting-conversion attainment against a 30% benchmark (20%), task follow-through (10%), and first-touch SLA (10%). Raw dial volume is visible as context but does not increase the score. These sample call grades are fictional inputs, not AI evaluations.

Per-opportunity fit is separate from team rank: same-segment qualification history (35%), required-skill fit (25%), call grade (20%), remaining capacity (10%), and follow-through (10%). The score is a recommendation, not an employment decision. Sample size and the manager's override remain visible.

These are prototype weights, not a claim about Graph8's internal algorithm. The four-step dispatch flow is implemented in the local simulation; uniqueness and production data definitions remain unverified.

## Build and run

Requires Node.js 22 or newer.

```sh
cd app
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. See [app setup and demo boundaries](app/README.md).

For local Gemini drafting, put `GEMINI_API_KEY` in the ignored `app/.env` and set `DEALDISPATCH_ENABLE_GEMINI=true`. Do not commit `.env` or put either API key in a `VITE_` variable.

## Vercel

Import the repository into Vercel with **Root Directory** set to `app` (the `docs/` directory is a sibling). The Vercel config builds `dist`. Add `G8_API_KEY`, `GEMINI_API_KEY`, and `DEALDISPATCH_ENABLE_GEMINI=true` as server-side project variables. The app has no login, so protect AI-enabled deployments and configure Google AI usage limits; keep Graph8 task writes disabled for a public demo. See [deployment instructions](app/README.md#deploy-to-vercel).

## Revenue hypothesis

If a team is currently distributing work without using comparable outcome quality and capacity, matching new work better could improve qualified handoffs per SDR and reduce high-intent work sitting unowned. For Graph8, the plausible value is deeper use of its CRM, dialer, analytics and task workflows, with better retention and execution-credit adoption. This is a hypothesis to measure, not a guaranteed revenue increase. Graph8's documented per-rep leaderboard and routing features make validation of the assignment gap essential.
