<div align="center">

<pre>
███╗   ███╗ ███████╗ ██████╗  ██╗ ██████╗  ██╗  █████╗  ███╗   ██╗
████╗ ████║ ██╔════╝ ██╔══██╗ ██║ ██╔══██╗ ██║ ██╔══██╗ ████╗  ██║
██╔████╔██║ █████╗   ██████╔╝ ██║ ██║  ██║ ██║ ███████║ ██╔██╗ ██║
██║╚██╔╝██║ ██╔══╝   ██╔══██╗ ██║ ██║  ██║ ██║ ██╔══██║ ██║╚██╗██║
██║ ╚═╝ ██║ ███████╗ ██║  ██║ ██║ ██████╔╝ ██║ ██║  ██║ ██║ ╚████║
╚═╝     ╚═╝ ╚══════╝ ╚═╝  ╚═╝ ╚═╝ ╚═════╝  ╚═╝ ╚═╝  ╚═╝ ╚═╝  ╚═══╝
</pre>

<h2>Know what comes next.</h2>

<p><em>Government-service preparation and cross-border case management, organized around you.</em></p>

<p>PROJECT MERIDIAN · Independent travel preparation</p>

<p><a href="https://meridian-lake-delta.vercel.app">Open Meridian</a> · <a href="https://github.com/biryanibetter/meridian">GitHub repository</a></p>

</div>

---

## About

Meridian is an independent GovTech government-service preparation and cross-border case management platform. It brings traveler profiles, entry requirements, application preparation, supporting documents and travel plans into one browser-local workspace.

Crossing a border involves more than an itinerary. What a traveler needs to prepare depends on their nationality, residence, purpose, dates and transit route. Official guidance is spread across different authorities, while evidence records, application references and deadlines are often kept separately.

Meridian connects those preparation steps without presenting them as permission to travel. Contextual official references help travelers investigate requirements; local tasks, document records and checklists help them organize what comes next. The current application is browser-local, with bundled geography and no connected government systems.

## Connected workspaces

The application has nine primary navigation areas and nine supporting views, all sharing the active journey and traveler context. A new browser workspace starts with sample records; saved local data is restored on subsequent visits. Sign-in opens that device's workspace, not a remotely authenticated account.

| Workspace | What it does |
| --- | --- |
| **Overview** | Summarizes the active journey, outstanding preparation and task-based readiness. Readiness measures recorded tasks, not immigration eligibility. |
| **Journeys** | Creates, switches, archives and restores travel plans. Archived journeys leave active lists and the journey selector without deleting their records. |
| **Journey workspace** | Edits purpose, dates, origin, destination, ordered transit stops and travelers. Departure-date changes recalculate relative task deadlines. |
| **Visa & entry** | Builds conditional preparation records around passport nationality, residence, destination, purpose and travel dates. Unsupported contexts retain an explicit coverage gap. |
| **Applications** | Tracks five stages: Requirements, Documents, Application, Submission and Status. Records manual review, external submission dates, references and user-entered status. |
| **Government case preparation** | Extends the existing application with a derived dependency graph, evidence readiness, appointments, deadlines, linked costs, recorded activity and official-source context. Unknown conditions are not completed by reviewing them. |
| **Optimize** | Deterministic multi-objective itinerary comparison with explicit cost uncertainty, preparation gaps, configurable preferences and Pareto alternatives. Manual quotes and illustrative routes are not live availability. Applying a scenario changes the canonical journey and route map. |
| **Documents** | Manages document metadata, categories, owners, expiry dates, preparation notes and prepared/reviewed states, with links to application requirements. No document files are uploaded. |
| **Tasks** | Organizes journey-specific preparation with relative deadlines, priorities, traveler ownership, dependencies, completion and list/timeline views. |
| **Travel** | Keeps recorded itinerary legs alongside an interactive geographical route map, with airport markers, great-circle segments, selection, pan and zoom. Geography is bundled locally, not fetched from tile servers. |
| **Transit** | Presents layover and connection preparation around the journey's recorded stops. Travelers still need to confirm airside access, baggage handling and transit permissions with the responsible parties. |
| **Travel-day checklist** | Tracks journey-specific airport preparation and provides a boarding-pass-style view of recorded flight details. It does not issue a boarding pass or perform check-in. |
| **Arrival** | Organizes arrival and relocation preparation, including transfers, accommodation, local contacts and first-day essentials through a saved checklist. |
| **Expenses** | Adds, edits and deletes journey-specific planned and actual amounts, recalculating totals and the remaining allowance. Recorded values persist locally; there is no live exchange-rate or payment service. |
| **Emergency assistance** | Collects preparation guidance and official-reference context for emergencies. It is not an emergency dispatch or live assistance service. |
| **Traveler information** | Manages traveler profiles and passport/residence context. Onboarding collects personal details, masks identifiers and uses an explicitly local session code. |
| **Notifications** | Groups workspace notices with read/unread filters and persistent read state. There is no external notification-delivery service. |
| **Settings** | Controls light/dark appearance and workspace preferences, with metadata export and privacy information. Language and currency preferences do not implement translation or currency conversion. |
| **Official references** | Lists source links and their coverage so travelers can consult the relevant authority. A reference is not a verified legal determination or a live government feed. |
| **Meridian Assistant** | Uses local intent matching to answer questions about the active journey, documents, tasks, transit, arrival and expenses, with links back to the relevant views. It does not call an external language model. |

A global **Find anything** dialog searches navigation, active journeys and current-journey tasks. The shared header keeps journey selection, appearance, notifications and the assistant within reach. Local changes persist across navigation and refresh when browser storage is available.

## Design and implementation

- Neutral-first light and dark themes: light canvas `#FAFAFA`, white surfaces and `#E4E4E7` dividers; dark canvas `#09090B`, `#141416` surfaces and `#27272A` dividers. Blue identifies actions and active context.
- System typography prioritizes SF Pro on supported Apple devices, with Segoe UI Variable / Segoe UI on Windows and system fallbacks elsewhere. No external font download is required.
- Compact navigation, tables and five-stage application controls use restrained borders, spacing and shadows. Responsive navigation and `prefers-reduced-motion` rules support smaller screens and reduced motion.
- Radix Dialog and Slot primitives, shared button/panel components and Lucide icons provide the interface foundation. The SVG map uses bundled Natural Earth polygons, an offline airport registry and great-circle geometry; unknown locations are not assigned invented coordinates.
- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 and pnpm form a single application, not a backend monorepo. Statically generated workspace routes preserve client navigation through `output: "export"`.
- One typed React context owns workspace state. Persisted records are validated and journey selection is normalized before use. Requirement generation, task dependencies, budget calculations, route resolution and assistant intent matching live in separate domain modules.

Data remains in browser storage for the current origin; it is not encrypted or synchronized across devices. Store only non-sensitive metadata. Passport and residence-permit identifiers are masked before persistence, but other profile information remains browser-readable. Moving from localhost to the hosted site does not transfer the existing workspace automatically.

Use fictional demonstration profiles only. Profile completeness and personal review are
separate from identity verification, which is unavailable. Circular indicators measure
recorded local work, not government approval. Optional additions to the existing schema
preserve earlier workspace records; invalid saved data is preserved rather than overwritten.
Settings provides metadata export and confirmed clearing of Meridian's local data.

Government fees are unknown unless recorded with appropriate source conditions.
Expenses distinguish known, estimated and unknown amounts and retain currencies without
exchange-rate conversion. A user-entered source link is not an independently verified fee.

Official references require internet access. Bundled map data and local preparation interactions do not require online providers once the application is loaded; this is not a service-worker-cached offline website. An optional Windows package serves the static application locally and includes a separate, simplified direct-file fallback.

## Repository layout

```text
app/                         App Router entry points, static routes and shared styles
components/workspace.tsx      Navigation, journey context and workspace shell
components/views/            Preparation, documents, travel and supporting views
components/ui/               Shared button and dialog primitives
lib/types.ts, lib/store.tsx  Typed workspace records and browser persistence
lib/requirements.ts          Contextual preparation records and coverage handling
lib/country-rules.ts         Conditional guidance and official-source registry
lib/journey-route.ts         Journey-derived origin, transit and destination route
lib/geography.ts             Offline airport registry and great-circle geometry
lib/assistant.ts             Local intent routing over the active workspace
public/assets/               Bundled geographical polygons and dataset attribution
scripts/                     Static server, optional USB packager and HTML fallback
lib/government.ts             Derived government cases and procedural dependencies
lib/optimization.ts           Deterministic multi-objective journey comparison
components/verification-progress-ring.tsx  Accessible local-completion indicators
tests/                       Domain tests and browser workflow verification
vercel.json                  Vercel build and installation settings
```

## Running locally

Prerequisites: Node.js **24.x** and pnpm **11.5.2**, as declared in `package.json`. No database, API keys or environment files are required for the implemented local functionality.

```powershell
pnpm install --frozen-lockfile
pnpm run dev                       # http://localhost:4274
```

Open the root page to **Sign in** to the local workspace or choose **Create account** to add traveler details and create a journey. The session code shown during onboarding is generated in the browser; it is not delivered by an identity provider and does not authenticate a government identity.

For a production-mode local launch, stop the development server before rebuilding:

```powershell
pnpm run build
$env:MERIDIAN_PORT = "4273"
pnpm run start                     # http://127.0.0.1:4273
```

The build emits static files into `out/`; `start` serves them through the included loopback-only Node server, rather than `next start`. With that server running, use a second terminal for checks:

```powershell
pnpm run test
pnpm run lint
pnpm run typecheck
pnpm run test:e2e
```

Browser tests require Microsoft Edge, selected by `playwright.config.ts`. Their default address is `http://127.0.0.1:4273`; set `MERIDIAN_TEST_URL` when using another address. `pnpm run test:e2e:legacy` retains historical checks with older selectors and optional USB dependencies; it is not the maintained production gate.

For an optional Windows x64 offline distribution, run `pnpm run package:usb` after building on Windows x64. Generated USB packages, portable executables, dependencies, build output and agent artifacts stay outside Git. Retain the included Node runtime license and [geographical dataset attribution](public/assets/GEOGRAPHY_LICENSE.txt) when distributing those assets.

For the same complete application in a standalone localhost presentation, build and
commit the validated source, then run `node scripts/package-local.cjs`. It creates
`../MERIDIAN_LOCAL_DEMO` outside this repository and refuses to overwrite an existing
package. The package includes its Windows x64 Node runtime, loopback server, static
assets, licenses and source commit identifier. It needs a modern browser but no
separately installed Node, pnpm, Python or administrator account. School executable
and localhost policies must still be checked on the presentation laptop. Official
links require internet; bundled preparation workflows do not. Vercel is an online
fallback and must not be described as localhost.

The hosted application is available at **[meridian-lake-delta.vercel.app](https://meridian-lake-delta.vercel.app)**. Vercel uses `vercel.json`, the pinned pnpm version and the existing static-export configuration; no server functions are needed. The production release was deployed through Vercel CLI. Automatic GitHub deployments still require granting Vercel access to this private repository and connecting it under **Project Settings → Git**.

## Verification status

Final release validation on **2026-11-14**: TypeScript, ESLint, production build,
**103 domain tests passed** (3 optional packaging checks skipped), and
**36 production-export browser tests passed**, including government case records,
Optimize persistence and destination synchronization, documents, journey editing,
maps, local sign-in, mobile layout and appearance. Local Node was **25.9.0**;
the deployment uses the declared **24.x** engine. No authorized government or
hosted identity integration is connected.

Previous deployment verification (before the government orchestration upgrade):
**2026-11-14**, local Node.js **25.9.0**, pnpm **11.5.2**. The local runtime differed
from the declared Node 24 requirement. The historical results below do not establish
validation of the current upgrade; consult its release report and rerun the commands.

- `pnpm install --frozen-lockfile` — **pass**, from a clean dependency installation without upgrading the lockfile.
- `pnpm run test` — **59 passed, 1 optional USB-archive check skipped**.
- `pnpm run lint` — **pass**, no errors or warnings.
- `pnpm run typecheck` — **pass**.
- `pnpm run build` — **pass**, with static workspace routes and bundled geographical assets.
- `pnpm run test:e2e` against the local production export — **19 passed**, including onboarding, journey creation and archiving, route/map synchronization, document actions, expense calculations, persistence and all five application stages.
- Hosted production checks — **5 functional browser tests passed**; **20 routes** loaded; the map rendered **177 country shapes**. Applications and Travel were checked at **375, 768 and 1440 px**, with no observed console or HTTP errors during the smoke checks.

Not yet verified or connected:

- Hosted account authentication, government identity providers, government document retrieval and cross-device synchronization. Existing provider adapters do not fabricate successful connections.
- Live immigration feeds, application submission, airline booking/check-in, payments, currency conversion, external notification delivery or external language-model inference.
- Automatic deployment from this private GitHub repository, pending Vercel repository access.
- Exhaustive accessibility, Safari/Firefox compatibility, performance benchmarking and a comprehensive production security/dependency audit. Edge/Chromium smoke tests do not establish those guarantees.

No government affiliation, legal eligibility decision, visa approval, border clearance or official document verification is claimed. Requirements outside the source registry remain **Official confirmation required**. Recorded application status and task completion describe the user's preparation, not an authority's decision.

## Project Scope

- **Clarity** — Bring journey details, contextual official references and preparation gaps into one place so travelers can understand what still needs confirmation.
- **Preparation** — Connect application stages, document metadata, tasks, expenses and itinerary details without confusing a completed checklist with authorization to travel.
- **Continuity** — Keep origin, transit, destination and arrival preparation aligned as plans change, with browser-local persistence and bundled geographical data.

## Our Vision

To make cross-border preparation easier to understand and manage, without hiding uncertainty or replacing official advice.

Meridian is built around the idea that travelers should be able to see their next practical step, understand why it matters and find the responsible source before making a decision. Future integrations would need to preserve that distinction between personal planning records and authoritative information.

## The Team

**PROJECT MERIDIAN** began as an offline hackathon build and is maintained in the **[biryanibetter/meridian](https://github.com/biryanibetter/meridian)** repository.

The work brings together interface design, frontend engineering and source-based travel-preparation research. Repository ownership and contribution history are available through **[biryanibetter](https://github.com/biryanibetter)** and the **[commit history](https://github.com/biryanibetter/meridian/commits/main/)**.

---

<div align="center">

<p><strong>PROJECT MERIDIAN</strong></p>

<p><em>Know what comes next.</em></p>

<p>Travel readiness · Cross-border journey management</p>

</div>
