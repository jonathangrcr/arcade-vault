<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project: Arcade Vault

An online platform to play games and compete for the highest score (see README.md).

## Commands

- `npm run dev` — start the dev server (Turbopack, App Router)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)

There is no test runner configured yet.

## Architecture

- **App Router** under `app/` (`app/layout.tsx`, `app/page.tsx`). Path alias `@/*` maps to the repo root (`tsconfig.json`).
- Styling via Tailwind CSS v4 (`@tailwindcss/postcss`), global styles in `app/globals.css`.
- Currently just the `create-next-app` scaffold — no custom routes, components, or data layer exist yet.

## Spec Driven Design

This project follows spec-driven development using the `/spec` and `/spec-impl` workflow from https://github.com/Klerith/fernando-skills, installed via:

```bash
npx skills@latest add Klerith/fernando-skills
```

When implementing features, check for and follow this spec workflow rather than jumping straight to code.
