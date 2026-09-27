# Graph8 SDK, MCP, and SDR Capability Audit

**Checked:** 2026-09-26  
**Purpose:** establish what Graph8 already provides, what its SDK/MCP can connect to, what DealDispatch currently does, and which SDR extension is still worth validating.

## Executive finding

Graph8 already has a substantial SDR management product. It publicly documents SDR performance dashboards, personal next-best actions, team comparisons, call grading, call analytics, leaderboards and goals, lead ownership, task assignment, meeting routing, and weighted round-robin workflow assignment.

That means **“rank SDRs,” “assign leads,” “route work,” “notify a human,” and “show SDR performance” are not safe claims of a new product by themselves.** They overlap with existing Graph8 features.

The strongest extension worth validating is narrower: **an explainable, manager-approved recommendation for who should own each eligible, unassigned SDR work item, using segment-specific qualified outcomes, current workload and follow-through—and measuring the result after handoff.** I did not find a public product page or a named API operation for that exact closed loop. That does **not** prove the feature is absent: Graph8 can build custom routing from existing workflow, analytics and assignment primitives. Ask the Graph8 product owner to confirm this gap before pitching it as new.

DealDispatch has a live Graph8 workspace alongside the fictional urgent-dispatch simulator. Analytics, tasks, and roster are read live. With `tasks:write`, a manager can explicitly assign an unowned open task to a roster member confirmed active and identified as an SDR; the server rechecks both records before writing. This live write path is not verifiable against the configured organization yet because it returned zero open tasks and no leaderboard rows. No verified SDR on-duty/capacity source is connected.

**Current implementation update (2026-09-27):** the product direction centers on the urgent handoff loop recovered from the earlier project chat: open a time-bound offer, require acceptance, reroute on decline/expiry, and escalate a capacity gap. The browser demo simulates those four stages. The server loads the SDR leaderboard, 30-day per-SDR activity, team summary and trends, dialer performance, open tasks, and team roster. A separate manager-confirmed action can write a task owner to Graph8; timed offers, reroutes, notifications, and outcomes remain simulated. The configured organization returned six summary metrics, 17 dialer metrics, six trend periods, one team member, zero leaderboard rows, zero per-SDR activity rows, and zero open tasks.

## Three different Graph8 surfaces

| Surface | What it is | What we verified |
|---|---|---|
| **SDK / Developer API** | Server-side API used by a product such as DealDispatch | `@graph8/sdk@0.245.0` is installed in `app/`. Its generated runtime exposes **3,247 API operations**. |
| **Graph8 MCP** | Tools an AI client can call during a conversation | The connected MCP documents **586 registered tools**, with **126 always-on**. Other tools appear after `g8_tool_search`. MCP authentication is not automatically shared with this app. |
| **Graph8 product UI** | Features a Graph8 customer already uses | Official Graph8 documentation shows many SDR management and routing capabilities are already shipped. |

These counts measure different things. A 3,247-operation Developer API contract is not 3,247 MCP tools or 3,247 product features.

The MCP observations above are dated research from the previous Graph8 task. No Graph8 MCP tool is exposed in the current Codex session, so current connectivity and selected organization are unverified.

## Full SDK inventory checked

The installed package reports version **0.245.0**. I checked both its package metadata and generated API catalog:

- **3,247 unique operations** in `g8.api.operations()` and the generated operation catalog.
- **140 API groups/tags** and **131 distinct permission scopes**.
- Side-effect tiers: 1,505 read, 810 write, 382 billable, 300 destructive, and 250 external.
- HTTP methods: 1,430 GET, 1,214 POST, 251 DELETE, 188 PUT, and 164 PATCH.
- Each generated operation records its stable ID, method, route, group, side-effect tier and required scope; SDK declarations provide typed request/response shapes.

The complete, operation-by-operation catalog is [api-operation-catalog.csv](../../sdk-lab/api-operation-catalog.csv). This is the exhaustive contract inventory used for this audit; the SDR-specific detail below is a focused interpretation of it.

**Version caveat:** the installed package's generated runtime and catalog both report 3,247 operations, while the package README also contains an older “587 operations” statement. The exact SDK artifact Graph8 eventually provides still needs to be compared by version and operation IDs; matching a total alone does not prove contract parity.

### SDK groups with direct SDR relevance

I inspected the full contents of these 24 groups (**1,038 operations** total), rather than assuming every API is relevant to SDR management:

| API group | Operations | Useful surface |
|---|---:|---|
| SDR analytics | 5 | SDR summary, detail, trends, leaderboard, AI-agent summary |
| Dialer analytics | 6 | Dialer and quality leaderboard, performance, call quality, graded-call search |
| General analytics | 51 | Outbound activity, SDR dashboards, channel/call/meeting funnels and trends |
| Revenue analytics | 6 | Team conversion, pipeline velocity, revenue dashboard, forecast and attribution |
| Tasks | 25 | Read/create/update/assign/resolve work and inspect execution history |
| Leads | 4 | Lead content and batch operations; lead ownership is exposed under Contacts |
| Team members | 21 | Read team members and their associated records; manage member records |
| Teams | 35 | Read teams/members and team resources; manage team membership |
| Sales Coach | 37 | Calls, transcripts, interviews, team scorecards and coaching configuration |
| Deals | 48 | Read/update deal ownership, stages, pipeline and outcomes |
| Meetings | 17 | Meeting and transcript context, follow-up review |
| Appointments | 92 | Booking, host/member and routing-form infrastructure |
| Workflows | 59 | Create/validate/execute workflows, inspect runs, approvals and integrations |
| Webhooks | 8 | Subscribe to events rather than poll, subject to key permissions |
| Events | 1 | Event surface in the generated contract |
| Signals | 56 | Buyer intent and activity signals that can support prioritization |
| Marketplace | 142 | Contracted talent, hiring, match and engagement lifecycle |
| Revenue records | 15 | Activity history, lifecycle snapshots and revenue plans |
| Revenue lifecycle | 5 | Read/change contact and company lifecycle stages |
| Voice | 187 | Calls, AI voice, inbound routes, recordings, transcripts and dialer surface |
| Dialer | 46 | Sessions, targets, callbacks, dispositions, queues and dialer control |
| Sequences | 71 | Outbound sequence/channel lifecycle and enrollment operations |
| Inbox | 22 | Inbox channels, assignment and communication operations |
| AI Inbox | 79 | AI-supported inbox triage and response operations |

Some groups contain mixed-purpose or high-impact operations. A group count does not imply every operation should be granted to DealDispatch. Each call must be selected by least privilege and its published tier/scope.

## Graph8 capabilities already shipped that overlap our idea

| Capability | Graph8 already documents | Consequence for DealDispatch |
|---|---|---|
| SDR execution and outcomes | Tasks due/completed, completion and SLA adherence, reply outcomes, conversations, meetings, personal stats, team comparison and prioritized next actions | A second SDR home dashboard or next-action queue is not differentiated. |
| Dialer productivity | Calls, human connections, rates, talk time, dispositions, meetings per connection, redials and best hours; daily/weekly/monthly team rankings and per-SDR goals | Do not pitch call analytics, simple rankings, call goals or dialer performance as new. |
| Revenue rankings | SDR/AE/dialer leaderboards; qualified opportunities, meetings, pipeline and revenue; team/region/agency rollups; custom composite metrics and goals | Another leaderboard or composite score alone overlaps. |
| Call coaching | Graded-call search, individual call grading, transcripts and SDR grade-trend/coaching reports | Standalone call grading or coaching cards overlap. |
| Lead and task ownership | SDR Manager can assign leads; leads can be reassigned; tasks have an assignee and can be assigned/reassigned | Generic work ownership is already supported. |
| Routing | Meeting booking/routing exists; Graph8 workflows document weighted round-robin assignment with pool and skip rules | Generic lead routing and “find a human” notification are already supported. |
| Workflows and channels | Multi-step workflows, integrations and channel actions; the CEO also said multichannel dispatch exists to a degree | SMS/WhatsApp/Slack dispatch is not the product thesis. |

Primary official references: [SDR Analytics](https://docs.graph8.com/analytics/sdr-analytics/), [Dialer Analytics](https://docs.graph8.com/analytics/dialer-analytics/), [Revenue Leaderboard](https://graph8.com/platform/revenue/leaderboard/), [SDR Manager guide](https://docs.graph8.com/roles/sdr-manager/), [roles and permissions](https://docs.graph8.com/settings/roles/), [Tasks](https://docs.graph8.com/data/tasks/), [Leads](https://docs.graph8.com/deals/leads/), [Workflows](https://docs.graph8.com/ai-features/workflows/), [Meetings](https://docs.graph8.com/engage/meetings/).

## What the contract and MCP can establish for SDR work

### Read signals and outcomes

- `g8.api.sdrAnalytics.getSdrSummary`, `getSdrDetail`, `getSdrTrends`, and `getSdrLeaderboard` expose the SDR analytics family under `analytics:read`.
- `g8.api.analytics.getSdrActivity` provides a separate per-SDR outbound activity report under `analytics:read`; this feed is included, but it returned zero rows for the configured organization.
- Dialer analytics include SDR performance, quality, and graded-call search under `analytics:read`.
- MCP tools verified by search include `g8_voice_get_dialer_stats`, `g8_voice_list_dialer_sessions`, `g8_voice_list_calls_for_sdr`, `g8_voice_get_call_grading`, and `g8_voice_get_call_transcript`.
- Other read families include tasks, team members/teams, meetings, deals, buyer signals, activity, and revenue analytics.
- The MCP activity summary is not an authoritative unlimited-period ranking: it scans at most 200 recent activities and reports when truncated.

### Find eligible work and a valid owner

- Tasks can be listed and partially updated; the documented owner field is `assignee_id` on `PATCH /tasks/{task_id}` (`g8.tasks.update`, `tasks:write`).
- Contact ownership can be assigned using `POST /contacts/assign-owner` (`contacts:write`).
- Team membership and role context can be read from the teams/team-members surfaces.
- Marketplace APIs can establish active contracted-talent context, but marketplace `sdr_id` must not be assumed to equal a CRM `user_id`.
- Existing leads, tasks, meetings and deals should be read with their canonical Graph8 IDs. A lead/SDR pairing must respect organization permissions and active contract/role rules.

### Automate and measure

- Workflow APIs provide validation, plans, runs, execution history, approvals and triggers. Graph8 documents weighted round-robin routing in workflows already.
- Webhooks can support event-driven updates if the appropriate subscription and signing scopes are available.
- Revenue analytics, meetings and deal outcomes can help measure the result—but we must verify the canonical “SDR sourced,” “qualified handoff,” and “held meeting” definitions first.

The fact that an operation exists proves API capability, not that the corresponding Graph8 UI feature is missing, available to this account, or permitted for our key.

## Product recommendation: DealDispatch as an SDR yield allocator

### Product and problem

**DealDispatch recommends which eligible SDR should own each unassigned buyer task to maximize qualified outcomes per unit of team capacity.** It combines per-segment results, current open workload and follow-through, gives the manager an evidence-backed reason, writes only the approved owner to Graph8, then measures what happened.

The manager problem to test is the seam between two existing functions: Graph8 can report SDR outcomes and can distribute/assign work, but those capabilities may not answer **“Given this exact lead, who is likely to work it well and on time right now?”** Manual choice and generic rotation can ignore differences in segment experience or current load. Do not claim every Graph8 team has this problem; validate it with the product owner and one SDR manager.

### Why this could add value without cloning Graph8

- Graph8's leaderboard and reports tell a team how it performed; DealDispatch would use comparable results to make a *per-work-item assignment recommendation*.
- Graph8's workflow documentation includes weighted round-robin; DealDispatch would recommend from demonstrated segment yield and current work load, explain the trade-off, and learn from the eventual result.
- The human stays in control. Graph8's own task/contact records remain the source of truth; no separate messaging channel is needed.
- For the customer's revenue team, the measurable target is faster first touch and more qualified/held meetings per SDR workday. For Graph8, the business case is adoption/retention and more work executed in Graph8; direct revenue lift is not proven until a pilot measures it.

### Concrete first build

1. **Manager queue:** load new/unowned eligible work from Graph8 and display its source, segment, urgency and linked record.
2. **SDR eligibility:** use team/role/contract permissions as hard gates. Use open tasks and due dates as workload; only use on-duty state if Graph8 provides a trustworthy value.
3. **Recommendation:** estimate per-segment qualified outcome rate with sample size, recent follow-through and workload. Show the evidence and uncertainty; do not optimize raw dials.
4. **Manager approval:** let the manager accept or override the suggested owner.
5. **Graph8 update:** assign the contact/lead owner or task executor using the correct Graph8 ID; ensure duplicate retries do not create duplicate work.
6. **Outcome measurement:** connect the handoff to meeting held/qualified/unqualified and sourced pipeline, then compare with the team's prior assignment baseline.

### SDK operations to use

| Product step | Generated SDK/API primitives | Needed scopes |
|---|---|---|
| Team performance baseline | `getSdrLeaderboard`, `getSdrSummary`, `getSdrTrends`; `/analytics/dialer/performance`, `/analytics/dialer/quality`, graded-call search | `analytics:read` |
| Work queue and workload | `list_contacts_contacts_get`; `list_all_tasks_tasks_get`; contact task reads; team/team-member reads | `contacts:read`, `tasks:read`, `team:read` |
| Buyer result context | Meeting funnel, meetings, deals, revenue analytics and lifecycle/activity reads | `meetings:read`, `deals:read`, `analytics:read` |
| Assignment write after manager approval | `PATCH /tasks/{task_id}` with `assignee_id`; `POST /contacts/assign-owner` | `tasks:write` and/or `contacts:write` |
| Keep data fresh | Graph8 workflow triggers and webhook subscriptions, if available to the key and the specific event family | `workflows:read/run`, `webhooks:read/run` only if needed |

These are API primitives, not proof that the feature is absent from Graph8. Avoid marketplace hire, campaign launch, email, SMS, WhatsApp, phone, or billable calls in this MVP.

### Success measures

- Median minutes from eligible signal arrival to first human touch.
- Qualified handoffs and meetings held per active SDR workday.
- Share of high-intent items left unowned beyond the SLA.
- Outcome by lead segment and source, with sample size.
- Workload imbalance, overdue tasks and manager overrides.
- Baseline vs pilot improvement; don't claim causal uplift from a simple before/after without accounting for source/segment mix.

## Live integration status

- `@graph8/sdk@0.245.0` is installed. The server loads the API key from ignored `app/.env`; it is never sent to browser code.
- The live snapshot was verified over the configured org key: HTTP 200, six 30-day summary metrics, 17 dialer performance metrics, six activity-trend periods, one team member, zero leaderboard rows, zero per-SDR activity rows, and zero open tasks. No assignment write was attempted because there was no task to assign.
- The app requests the leaderboard, SDR summary/trends, dialer performance, open tasks, and roster through the SDK. It displays live, empty, or per-source error states and does not substitute demo data in the live workspace.
- Offer dispatch, acceptance, reroute, assignments, and outcomes remain local simulation state. Live dispatch is not safe without real work, identifiable SDR performance rows, and verified on-duty/capacity/identity data.
- No task, lead, deal, campaign, or other Graph8 record was modified during the read-only verification; the explicit task-owner write path is separate and requires manager confirmation plus `tasks:write`.
- The API key was pasted into chat. Replace it with a newly generated org key in Graph8 Settings → API and update `app/.env`; never send the replacement through chat.

## Gap-validation question

Ask Graph8: **“Does Graph8 already recommend an owner for each unassigned SDR lead/task using segment-specific qualified outcomes, current task load and follow-through, then measure whether that assignment improved the qualified handoff rate? If so, which exact surface should we extend instead?”**

If Graph8 confirms it already does this, do not build a duplicate. If not, show a manager one work item, three evidence-backed eligible SDR choices, an approval, and the measured outcome end to end.

## Earlier feature audit: overlap to avoid

The following were found to be shipped or documented: SDR dashboards, next-best actions, SDR and dialer rankings, call quality/coaching, goals, lead/task assignment, meeting routing, and weighted round-robin workflow assignment. Use the citations below to support those claims.

Primary official references: [SDR Analytics](https://docs.graph8.com/analytics/sdr-analytics/), [Dialer Analytics](https://docs.graph8.com/analytics/dialer-analytics/), [Revenue Leaderboard](https://graph8.com/platform/revenue/leaderboard/), [SDR Manager guide](https://docs.graph8.com/roles/sdr-manager/), [roles and permissions](https://docs.graph8.com/settings/roles/), [Tasks](https://docs.graph8.com/data/tasks/), [Leads](https://docs.graph8.com/deals/leads/), [Workflows](https://docs.graph8.com/ai-features/workflows/), [Meetings](https://docs.graph8.com/engage/meetings/).

## Sources and limits

- Local SDK package: `app/node_modules/@graph8/sdk` version 0.245.0.
- Complete generated operation catalog: `sdk-lab/api-operation-catalog.csv`.
- Local OpenAPI research notes: [16-generated-openapi-contract.md](../../16-generated-openapi-contract.md).
- Graph8 official docs linked above. Web pages can change; recheck the exact hackathon build and SDK version before implementation.
- Read-only marketplace, SDR leaderboard, SDR summary, and dialer leaderboard API requests succeeded. No team member records or call transcripts were fetched. No Graph8 records were changed.
- The user-supplied key is stored only in ignored `app/.env`; because it was pasted into chat, rotate it in Graph8 Settings → API and replace the local value.
