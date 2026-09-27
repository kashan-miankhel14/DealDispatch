# DealDispatch

DealDispatch has two distinct modes: a live Graph8 workspace with a manager-confirmed task assignment action, and a synthetic four-step urgent-handoff simulator. Live data is never silently substituted with sample data.

## Use case and honest feature boundary

The target user is an SDR manager responsible for time-sensitive inbound or high-intent work. The hypothesis is that a hot, qualified item can remain unowned when the first rep is unavailable or does not accept it. DealDispatch demonstrates an explicit offer window, a next-rep fallback on decline/timeout, and a visible manager coverage gap when nobody is eligible. The intended outcome is less orphaned work and a shorter time from signal to human response.

This is **not a verified Graph8 product gap**: Graph8 already provides lead/task ownership, routing and workflow tools, SDR analytics/next-best actions, and AI sales capabilities. This prototype's four-step loop is synthetic; no live buyer signal, SDR duty/capacity, offer response, notification, timed reroute, or outcome write is connected. Do not claim the workflow is unique until Graph8 confirms it.

For the demo: show Graph8 data and global search as integrations; use Gemini as an optional, fact-grounded SDR preparation assistant; then run the synthetic urgent-handoff scenario to test the product hypothesis. The live organization currently returns no SDR leaderboard rows and no open tasks, so the simulator uses fictional SDRs and buyer signals. Never present its hierarchy, scores, availability, value, or outcomes as customer data.

The detailed talk track, four-step explanation, overlap matrix, and validation questions are in [the demo pitch](../docs/DEMO_PITCH.md).

## Run it

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The app opens on **Live Graph8**. Choose **Urgency simulation** to change the acceptance window, open an offer, simulate acceptance/decline/timeout, and see rerouting or a capacity gap. The demo workflow is saved in the browser; it does not message reps or write Graph8 assignments.

The Live Graph8 page also shows a clearly separated **Synthetic demo data** preview: six fictional SDRs, three sample opportunities, illustrative scores, and a shortcut to run the full handoff. Select **Reset & run four-step demo** to start with a clean queue. The demo seed is never substituted into Graph8 analytics.

The **Demo org & scorecard** view also shows a fictional three-manager / six-SDR reporting tree, team focus, availability, workload and outcome totals. It is a presentation fixture, not a hierarchy imported from Graph8. When live Graph8 has no SDR or task rows, a prominent callout links directly to this demo and the dispatch simulation; live panels remain empty and honest.

## Walk through a handoff

1. Choose **Reset & run four-step demo** or open **Urgency simulation**.
2. Select an opportunity and review its buyer signal, evidence, estimated value, and required skills.
3. DealDispatch ranks eligible SDRs. Eligibility requires every listed skill, active engagement, on-duty status, capacity, and no prior decline/timeout for that opportunity.
4. Open the timed offer. Click **Accept offer**, **Decline · reroute now**, or let it expire. Declines and timeouts send the offer to the next eligible SDR; when none remain, the work becomes a visible coverage gap.
5. For accepted work, record **Qualified handoff** or **Close · not qualified**. The demo scorecard, segment history, pipeline, capacity, and audit trail update locally. **Reset demo** restores the original sample.

All offers, timers, outcomes, and performance changes are local simulation only. No message is sent and no Graph8 task is created by this flow. The separate Live Graph8 panel can assign an existing open task after manager confirmation.

## Analytics & charts

Open **Analytics & charts** in the left navigation. The top charts use actual numeric Graph8 trend periods and leaderboard rows only; choose a metric from each chart's selector. If Graph8 returns no usable periods or SDR rows, the live chart explains why and stays empty rather than inventing data. The lower activity funnel and pipeline-by-SDR chart use the fictional demo roster and are explicitly labeled synthetic. Recording outcomes in the urgency simulator updates that sample funnel and pipeline.

## What Gemini does

On **Live Graph8**, search the global prospect index, edit the value proposition, then choose **Draft outreach with Gemini** on a result. One Gemini call creates a grounded SDR prep pack: fact summary, call opener, three qualification questions, cautious next human action, and first-touch email. The SDR reviews and copies the pack. Gemini does not infer intent, score leads, choose an SDR, or send anything.

## Graph8 work-rescue queue

The live queue reads Graph8's open-task rows (caps the view at 100 loaded records and displays the first 12) and includes assigned work as well as unassigned tasks. It puts overdue, due-within-24-hours, high-priority, 7+-day-old, and then unassigned work first. This is transparent date/priority sorting—not an AI score or a replacement for Graph8's task views. Only an unowned task can show the assignment action, and that Graph8 write remains manager-confirmed. With zero Graph8 open tasks, the queue is honestly empty; the synthetic simulator remains separate.

## Graph8 live reads

The server loads `G8_API_KEY` from `.env`; the key never enters browser code. Initial page load and **Refresh live data** request the SDR leaderboard, 30-day per-SDR activity and team summary, weekly activity trends, dialer performance, open tasks, and team roster. Give the key `analytics:read`, `tasks:read`, and `team:read` access. Each feed shows actual Graph8 values or a clear empty/permission/error state. Task writes are disabled by default. To enable **Assign in Graph8**, grant `tasks:write` and set `DEALDISPATCH_ENABLE_TASK_WRITES=true`; the server rechecks that the task is open and unowned and the selected roster member is active and identified as an SDR, then asks for manager confirmation before updating its owner. Missing Graph8 rows are never replaced with sample records.

Graph8 must be reachable from the app server. The SDK/MCP credentials are separate; an MCP login does not configure this app's API key. Do not put credentials in frontend variables or commit `.env`.

The live view also includes an on-demand, read-only search of Graph8's global contacts and company index. Give the key Graph8 global-search access (`search:run`). Searches are capped at 10 results, limited to five requests per minute per server instance, and may consume Graph8 search credits; results are displayed only and are not imported into the organization.

## Gemini outreach copilot

Each Graph8 global prospect result can produce an SDR prep pack through Google's Gemini Developer API `generateContent` endpoint. The app defaults to `gemini-3.8-flash` and requests schema-constrained JSON. Drafting is user-triggered; the SDR reviews/copies the result, and the app never sends email. The prompt includes the prospect's name, role, company, industry, domain, description, and editable product proposition. It excludes email addresses and profile URLs. Gemini returns evidence field IDs; the server maps them back to exact supplied Graph8 facts and discards unknown IDs. Synthetic demo call grades are sample data and are not AI grades.

Local `.env` and Vercel server environment variables need `GEMINI_API_KEY`, with `GEMINI_MODEL=gemini-3.8-flash` optional. Set `DEALDISPATCH_ENABLE_GEMINI=true` to enable the route. Gemini requests are capped at three per minute per server instance, use a short output budget and timeout, and require a same-origin request. This is an in-memory per-instance throttle, not user authentication or a global spend limit. The app has no sign-in: keep the feature disabled on an unrestricted public deployment or put the app behind access protection and set project-level Gemini quotas/budgets. Don't put either Gemini or Graph8 credentials in frontend variables or commit `.env`.

## Deploy to Vercel

Create a Vercel project with this `app` directory as its Root Directory. Vercel builds the Vite frontend into `dist` and exposes the Graph8 and Gemini endpoints as Node.js functions under `api/`. Add `G8_API_KEY` and `GEMINI_API_KEY` as server-side environment variables for Preview and Production; never define them as `VITE_` variables. The global search endpoint also needs the Graph8 key's `search:run` permission and an account plan/credit balance that permits searches. Gemini drafting uses Google AI quota and should only be enabled on access-protected deployments: set `DEALDISPATCH_ENABLE_GEMINI=true` after protection is configured. Keep `DEALDISPATCH_ENABLE_TASK_WRITES` unset or `false` on public deployments; turn it on only behind Vercel Deployment Protection or equivalent access control. Local development continues to use `.env`.

## Data boundaries

- The demo scorecard and urgency simulator use synthetic SDRs, buyer signals, urgency, skill requirements, outcome scores, and offer responses.
- Graph8 leaderboard order and performance metrics are displayed only in the live view. They do not currently feed the demo ranker. The live API response does not provide the verified duty/capacity information needed for safe live dispatch.
- Analytics, open tasks, and roster are read from Graph8. A manager-confirmed action can assign an existing unowned open task to a verified active SDR; it does not initiate the synthetic urgent-offer loop.
- Timed acceptance, decline/timeout rerouting, capacity-gap escalation, and outcome capture remain synthetic browser state. On-duty status/capacity is not returned, so live automatic dispatch is intentionally disabled.
- Actual reporting hierarchy, team membership mapping, on-duty state, and per-rep capacity are not currently read. Do not present the flat roster as a management hierarchy or claim automatic workload balancing until those Graph8 data are available.
- The product hypothesis is reducing unowned high-intent work and time-to-first-human-touch through an explicit timed acceptance and fallback loop. Validate it against a control group; do not attribute impact to the synthetic demo.
- The application does not send email, calls, SMS, WhatsApp, or chat.
- Graph8 routing, lead/task assignment, leaderboards, and marketplace matching already exist. The time-bound acceptance and automatic reroute loop is the proposed distinction; Graph8 must confirm whether it is new.

For the code map, scoring formulas, state transitions, API routes, and deployment checklist, see [the DealDispatch walkthrough](../docs/dealdispatch-walkthrough.md).

See the [current product hypothesis](../docs/sdr-performance-assignment.md) and [full Graph8 SDK/MCP audit](../docs/graph8-sdr-sdk-mcp-audit.md).
