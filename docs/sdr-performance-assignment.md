# DealDispatch: urgent handoff prototype

## Current product direction

DealDispatch handles a specific failure mode: valuable, unowned SDR work waits because a rep has not explicitly taken responsibility. The prototype ranks eligible reps for the work, offers it with an acceptance deadline, reroutes declines and timeouts, and raises a manager-visible capacity gap when nobody can take it.

Graph8 already documents SDR analytics, next-best actions, call grading, leaderboards, goals, task/lead ownership, meeting routing, and weighted round-robin workflows. DealDispatch is therefore not a new leaderboard or a generic routing product. The time-bound acceptance and reroute loop is the proposed distinction, but public documentation cannot establish that it is missing or globally unique. Do not make either claim without Graph8 confirmation.

## Four-step demo flow

1. Detect an urgent, unowned work item and show its signal and age.
2. Rank eligible SDRs using the sample's same-segment results, skill fit, call grade, capacity, and follow-through; open a timed offer.
3. Require explicit acceptance. A decline or expiry removes that SDR from this work item's offer pool and reroutes to the next eligible person.
4. Record accepted ownership or show a capacity gap for manager review; record the later qualified/not-qualified outcome in the audit trail.

The acceptance window is configurable. Demo offers, rep responses, assignments, outcomes, and score changes are local browser state; the demo sends no messages and makes no Graph8 writes.

## Live Graph8 data

The app server reads the SDR leaderboard and 30-day per-SDR activity, team summary/trends, dialer performance (`analytics:read`), open tasks (`tasks:read`), and team members (`team:read`). The Live Graph8 screen shows actual metric values and rows; empty responses and per-source errors are explicit, and demo fixtures never appear as live data. With `tasks:write`, a manager can explicitly assign an unowned open task to a roster member confirmed active and identified as an SDR; the server rechecks the task/member immediately before writing. The configured organization returned 6 summary metrics, 17 dialer metrics, 6 trend periods, 1 roster member, 0 leaderboard rows, 0 per-SDR activity rows, and 0 open tasks.

The live task and roster records do not drive the synthetic offer eligibility loop. The demo ranker uses synthetic data only. A confirmed owner update is live, but timed offers, response capture, rerouting, and outcomes are not persisted to Graph8. Graph8's current API surface and account response do not establish a canonical availability or capacity source in this app. Do not infer on-duty status, contract eligibility, or CRM identity from an analytics row or marketplace `sdr_id`.

## Criteria and boundaries

- Preserve existing task/contact ownership; the prototype only illustrates new unowned work.
- Treat role, contract, skills, schedule, and capacity as eligibility gates; use only verified source data in production.
- Keep the manager able to review evidence and override a proposed recipient.
- Do not send outreach or hire marketplace talent automatically.
- Separate qualified handoffs from closed-won revenue and preserve attribution when ownership moves to an AE.
- The score weights and all scenario values are fictional examples, not Graph8's internal algorithm or validated benchmarks.

## Verification still needed

- Confirm with Graph8 whether its own routing/workflows already provide this acceptance deadline and automatic reroute behavior.
- Populate the organization with real SDR leaderboard rows and open tasks, then verify current API-key scopes and identity mapping in the app server environment.
- Identify the source of truth for SDR availability, shift, capacity, contract, and user identity before live assignment.
- Define the canonical qualified handoff, held meeting, and SDR-sourced outcome fields before measuring impact.
- Confirm the provided hackathon SDK version against the installed SDK before relying on its operation catalog.

See the [full Graph8 SDK/MCP audit](graph8-sdr-sdk-mcp-audit.md) for existing product overlap and integration notes.
