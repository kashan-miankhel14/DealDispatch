# DealDispatch: demo pitch and feature boundaries

## The 30-second explanation

> SDR managers can already see leads, tasks, intent, and rep performance in Graph8. The narrow problem we are testing is what happens when a time-sensitive, qualified buyer signal needs a human and the first eligible rep does not take it. DealDispatch prototypes an explicit response window, a next-rep fallback after decline or timeout, and a visible manager escalation if nobody can cover it. The goal is less urgent work left ownerless and less time from signal to a human response. The dispatch loop is a simulation today; we need Graph8 to confirm whether its workflows already support this exact behavior.

## User and problem

- **Primary user:** SDR manager handling high-intent inbound or event-triggered work across a team.
- **Failure to test:** urgent work waits unowned while a manager manually finds an available, suitably skilled rep; the first assignment may not be acknowledged.
- **Hypothesis:** sequential, time-bounded acceptance with explicit fallback will improve coverage and time-to-first-human-response compared with the team's current routing process.
- **Not the claim:** Graph8 lacks routing, that SDRs are generally inefficient, or that this prototype has already improved revenue.

## Four steps in the prototype

1. **Signal:** an urgent work item enters the queue with evidence, value, segment, and required skills. Current items are fictional demo data; no live Graph8 intent event feeds this queue.
2. **Eligibility and fit:** exclude reps who are inactive, off duty, over capacity, missing any required skill, or already declined/timed out for this item. Rank the remaining sample reps using the displayed demo factors. Duty, capacity, and skills are not verified from this organization's Graph8 data.
3. **Time-bound offer:** present the item to one person for a manager-configured window. Accept claims ownership; decline or expiry removes that rep from this item's offer pool and offers to the next eligible person.
4. **Resolve and learn:** if nobody is eligible, show a coverage gap for a manager. Record qualified/not-qualified outcome in browser demo state and update the illustrative scorecard and audit trail. This outcome is not written to Graph8.

The four steps are implemented in the **Urgency simulation**. They are not a live automated dispatch integration. The separate **Live Graph8** page reads actual API responses and keeps empty/error states empty; the current organization returned 0 SDR leaderboard rows, 0 per-SDR activity rows, and 0 open tasks, with 1 team member. It therefore cannot provide real SDRs or customer work for this workflow.

## What is and is not differentiated

| Capability | Graph8 status | DealDispatch status |
| --- | --- | --- |
| SDR analytics, leaderboards, goals, dialer metrics, next-best actions | Already documented in Graph8; overlap | Displays selected Graph8 feeds; not a new analytics product |
| Lead/task ownership, meeting routing, workflow routing | Already documented in Graph8; overlap | Reads tasks; optional manager-confirmed assignment of an existing unowned open task |
| AI sales agents and outreach support | Already documented in Graph8; overlap | Optional Gemini-generated, human-reviewed prospect prep pack; not a unique AI claim |
| Exclusive offer deadline → accept/decline/timeout → sequential fallback → visible coverage gap | Exact same workflow not confirmed either way | Interactive synthetic prototype; possible extension to validate, not a proven Graph8 gap |

Graph8's published APIs and configurable workflows could already implement some or all of the proposed handoff. Do not tell judges or Graph8 that the dispatch idea is unique until its product owner confirms it. The strongest honest pitch is an **integrated workflow hypothesis**, not a standalone replacement for Graph8.

## Why Gemini is included

The optional Gemini step uses selected Graph8 global-search facts plus the user's value proposition to prepare a short fact summary, call opener, three qualification questions, cautious next human action, and first-touch email. The server checks returned evidence IDs against supplied facts. A person reviews and copies the pack; Gemini does not decide buyer intent, rank SDRs, assign work, or send messages. This can reduce prep effort, but Graph8 already offers AI sales capabilities, so it is supporting functionality—not the differentiator.

## What to measure in a real pilot

Compare the current Graph8 routing process with the proposed handoff for similar signal types and shifts:

- Median signal-created → first human acceptance time.
- Share of qualified urgent items accepted within the chosen SLA.
- Share left uncovered, plus the decline/timeout/fallback rate.
- Qualified handoff rate and held-meeting rate by segment and source.
- Guardrails: duplicate ownership, inappropriate urgency, rep overload, opt-outs, and reassignment churn.

Do not use simulated score changes as impact evidence. Agree with Graph8 on event definitions, attribution, and a control/baseline before claiming efficiency or revenue lift.

## Suggested live demo sequence

1. Start on **Live Graph8**. Show the connection timestamp and explain that the API key works, but this supplied organization has no SDR/task rows to dispatch. Do not fill the gap with fictional live data.
2. If enabled and credits are approved, search the Graph8 global index for a real prospect and generate the Gemini prep pack. State that the prospect index is separate from this organization's SDR activity.
3. Open **Urgency simulation** and say, “The next records are fictional; this lets us test the handoff behavior without pretending the organization has activity.”
4. Run one signal through the four steps: open offer, accept once; reset and show timeout/decline → reroute; add a scenario with no eligible SDR to show the coverage gap; record a sample outcome.
5. Close with the feature-gap question: “Does Graph8 already support an exclusive, timed offer with automatic sequential fallback and an auditable acceptance/outcome loop? If yes, what supported workflow/API should we integrate with?”

## Before public deployment

- Set Vercel's **Root Directory** to `app`; put Graph8/Gemini keys only in server-side environment variables, never `VITE_` variables or the repository.
- Keep `DEALDISPATCH_ENABLE_TASK_WRITES` unset/false. Keep Gemini disabled on an unrestricted public app; enable it only behind access protection and with provider quotas. Same-origin checks and per-instance throttles are not user authentication or a global spend limit.
- Use least-privilege Graph8 read scopes for the demo. Global search may consume credits; do not run it without approval.
- The Gemini key was pasted into a chat. Rotate it in Google AI Studio before treating a public deployment as production-safe, then update Vercel's server-side variable.
- The app builds for Vercel, but a successful local build does not prove that production environment variables, Graph8 permissions, search credits, Gemini quota, or Vercel access protection are configured.
