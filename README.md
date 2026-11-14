# Meridian

Travel readiness and cross-border services, organized around passport, residence, purpose and route.

## Deployment

Import this private GitHub repository into Vercel and use the included configuration.
The app builds as a static Next.js export (`out/`), with no server functions, API keys,
external map tiles, or required environment variables. Node.js 24 and pnpm 11.5.2
are selected in `package.json`.

Sign-in opens the local browser workspace; it is not a hosted authentication service.
Use Create account to add a traveler and a journey. Workspace metadata persists in
browser storage and is not synchronized between devices or domains.

## Boundaries

- Preview environment: no government systems connected. Local code acceptance is not government identity verification.
- Preparation templates and official-source references are not legal eligibility decisions. Unsupported or unverified applicability is marked **Official confirmation required**. Fees, processing times and approvals are not invented.
- Government application links open an external official website when online. Meridian does not submit an application.
- The assistant uses local intent matching over the active workspace, not an external language model.
- Browser storage is not encrypted. Only non-sensitive metadata belongs here; no scans or document files are uploaded. Passport numbers are transient and only masks are saved.
- Workspace data belongs to the browser/address, not the USB. Use Settings to export metadata.
- Official-source websites require internet; all essential preparation interactions and map assets are local.
- The full map is a 2D geographical view with real airport coordinates and great-circle routes. Unknown airports are not fabricated. No online tiles or unlicensed fonts.
- A school’s execution policy, browser configuration and Windows architecture must be checked on the actual target device. The HTML fallback avoids relying solely on executable permission.

## Development

Existing stack: Next.js 16, React 19, TypeScript and Tailwind; one shared browser-state provider.

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm run dev
```

Development: `http://localhost:4274`.

```powershell
pnpm run test
pnpm run typecheck
pnpm run lint
pnpm run build
```

Build uses `output: "export"` and emits static `out/`. The optional
`pnpm run package:usb` command remains available for offline Windows distributions;
generated packages and runtimes are excluded from Git and Vercel.

## Structure

- `components/workspace.tsx` — shared navigation and shell.
- `components/views/` — journey, visa, application, document, travel and settings workspaces.
- `lib/types.ts`, `lib/store.tsx` — shared typed data and persistence.
- `lib/country-rules.ts`, `lib/requirements.ts` — source registry and conditional preparation.
- `lib/identity-providers.ts`, `lib/verification.ts` — unconnected provider adapters and local code flow.
- `lib/assistant.ts` — deterministic intent routing.
- `lib/geography.ts`, `public/assets/` — local airport and Natural Earth data.
- `scripts/` — portable server, package builder and independent fallback.
- `tests/` — domain and packaged-browser checks.

Browser checks use installed Edge. Serve the production export with
`node scripts/server.cjs out` and run `pnpm run test:e2e`.
Set `MERIDIAN_TEST_URL` to test another deployment. Historical USB-only checks
require the optional local package. Geographical dataset attribution is retained
in `public/assets/GEOGRAPHY_LICENSE.txt`.

`pnpm run test:e2e` runs the maintained production suite. Historical checks,
including older UI selectors and optional USB artifacts, remain available through
`pnpm run test:e2e:legacy`; they are not the production verification gate.
