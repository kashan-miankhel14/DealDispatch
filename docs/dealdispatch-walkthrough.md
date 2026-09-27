# DealDispatch Project Walkthrough

## What the app does

DealDispatch has two deliberately separate data lanes:

- **Live Graph8:** reads the configured organization's SDR analytics, roster, open tasks, and optional global prospect search. Live task ownership changes are an explicit, gated write.
- **Synthetic demo:** uses fictional SDRs, opportunities, scores, buyer events, offers, and outcomes to demonstrate urgent handoff routing. Demo actions are stored in this browser only and never change Graph8.

The Live Graph8 page shows both lanes, but puts the synthetic preview in its own marked panel. Empty live results stay empty; sample records are not passed off as Graph8 data.

## Demo walkthrough

The starter dataset in `src/model.ts` has six fictional SDRs and three fictional buyer opportunities: Northstar Robotics, Meridian Cloud, and Cobalt Payments. The account names, buyer events, deal values, roster, and performance metrics are made up for demonstration. Values are illustrative, not forecasts or Graph8 customer data.

1. On Live Graph8, review the separate synthetic preview, then click **Reset & run four-step demo**.
2. In Urgency simulation, inspect the selected buyer work: signal, evidence, illustrative value, segment, and required expertise.
3. DealDispatch ranks the team. A candidate must have **all** required skills, an active engagement, be on duty, have open capacity, and not have already passed on that opportunity.
4. Click **Open timed offer to best fit**. For the quickest path, click **Accept offer** before the deadline. The sample SDR's load increases.
5. Click **Qualified handoff** to update the demo's qualified count, pipeline, segment sample, and audit trail; or close it as not qualified to update the sample size and release capacity.
6. To see rerouting, reset, open an offer, then click **Decline · reroute now** or wait for its timer. DealDispatch records the decline/timeout and offers the work to the next eligible SDR. When nobody remains eligible, the queue records a coverage gap.

Use **QUEUE VIEW** to switch among all work, needs-action work, assigned work, and coverage gaps. **Add signal** inserts another synthetic opportunity. **Reset demo** restores the original scenario and resets the timer/window. The demo is saved in local browser storage under `dealdispatch.demo.v2` only if available; it is not a server database.

## How ranking works

Eligibility is a hard gate, not a score bonus: every required expertise tag must match, the SDR must have an active engagement, be on duty, have capacity, and not appear in the opportunity's `tried` list. Ineligible SDRs cannot receive offers.

Eligible SDRs are sorted by a 0–100 fit score:

- 35% same-segment outcome history, smoothed with the SDR's overall qualification rate
- 25% required-skill coverage
- 20% call grade
- 10% available capacity
- 10% average follow-through and first-touch SLA

The separate demo scorecard uses 35% goal attainment, 25% call grade, 20% meetings per connection relative to a 30% benchmark, 10% follow-through, and 10% first-touch SLA. Call volume is visible as context but does not increase the impact score. A qualified result updates the sample rep's metrics and pipeline; a negative result updates the completed segment sample and releases the assignment slot.

## Four-stage state machine

- `new`: signal is in the queue and can be ranked.
- `offered`: one eligible SDR has a deadline; accept makes the item owned, decline reroutes immediately, and timeout reroutes automatically.
- `owned`: accepted by an SDR; manager records a qualified or not-qualified result.
- `gap`: all eligible candidates declined, timed out, or no candidate met the gates; the item stays visible for human review.

The timer, offer responses, assignment ownership, and outcomes are simulation state. No email, phone call, SMS, Slack message, or Graph8 write is sent by the demo. Browser refresh preserves the demo state; reset restores the initial sample.

## Graph8 data flow

`src/App.tsx` calls same-origin routes. The API modules under `api/graph8/` are the Vercel function entrypoints; they delegate to `dealdispatch-handler.mjs`, which uses the server-only `@graph8/sdk` key.

- `GET /api/graph8/snapshot`: parallel reads for SDR leaderboard, per-SDR activity, summary, dialer analytics, trends, open tasks, and team members.
- `POST /api/graph8/prospects/search`: user-triggered search of Graph8's separate global index; max 10 results, same-origin check, and a process-local cap of five requests per minute. Results are not imported into the organization and Graph8 may charge credits.
- `POST /api/ai/prospect-outreach`: sends selected public prospect fields and the user's offer to Gemini (`gemini-3.8-flash` by default) to draft a grounded first-touch email. Email addresses/profile URLs are excluded, verified evidence IDs are mapped back to supplied fields, and no message is sent. Requires server-only `GEMINI_API_KEY` and `DEALDISPATCH_ENABLE_GEMINI=true`; same-origin and three-requests-per-minute per-instance cap.
- `POST /api/graph8/tasks/:taskId/assign`: disabled unless `DEALDISPATCH_ENABLE_TASK_WRITES=true`. When enabled, the server validates the same-origin request, task is open/unowned, selected member is active and has an SDR role, performs the write, and verifies Graph8 returned the new owner. The UI also asks for manager confirmation.

Global prospect search is not SDR activity: it will not populate the organization's leaderboard, calls, tasks, or summary. Graph8's on-duty/capacity information is not available in the current live roster responses, so the synthetic panic flow cannot safely auto-dispatch live tasks.

## Code map

- `src/model.ts`: demo types and seed data; score, eligibility, and queue-filter rules.
- `src/App.tsx`: page state, browser persistence, user actions, Graph8 fetches, and all four sections.
- `src/App.css`, `src/Urgency.css`, `src/Prospects.css`, `src/DemoPreview.css`, `src/AiOutreach.css`, `src/Presentation.css`: layout, AI states, and presentation-sized typography.
- `dealdispatch-handler.mjs`: server-only Graph8 reads/search/assignment, Gemini outreach generation, and static fallback for local production runs.
- `api/graph8/`, `api/ai/`: Vercel function routes; `local-server.mjs` and `dev.mjs` are local development entrypoints.
- `vercel.json`: Vite production build command and static output directory.

## Deploy checklist

1. In Vercel, set the Root Directory to `app`, build command to `npm run build`, and output directory to `dist`.
2. Add `G8_API_KEY` as a server-side environment variable for Preview and Production. Never use a `VITE_` prefix.
3. Add `GEMINI_API_KEY` as a server-side environment variable. Optionally set `GEMINI_MODEL=gemini-3.8-flash`. Set `DEALDISPATCH_ENABLE_GEMINI=true` only after access protection is enabled; model calls use Google AI quota.
4. The Graph8 key needs read scopes for the live surfaces and global-search permission for prospect search. Search is credit-bearing, so protect a public deployment and do not expose a paid key to unrestricted traffic.
5. Task writes are off by default. Keep them off on a public demo. To enable the Graph8 write action, add `tasks:write`, set `DEALDISPATCH_ENABLE_TASK_WRITES=true`, and put Vercel Deployment Protection or equivalent access control in front of the deployment. The browser confirmation is a UX check, not an authentication system.
6. Run `npm run build` and `npm run lint` before deploying. After deployment, test the read-only snapshot, a one-result search, and a manually reviewed AI draft. Confirm the Vercel function logs show no keys or contact data.

No Vercel deployment is created by this codebase alone; someone with access to the Vercel project must connect or deploy the repository and configure its secrets.
