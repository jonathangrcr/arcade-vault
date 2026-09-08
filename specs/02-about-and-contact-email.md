# 02 — About Page & Contact Email

**State:** Implemented
**Dependencies:** [01-home-page](01-home-page.md) (Nav.tsx structure, `app/globals.css` theme tokens)
**Date:** 2026-09-06

**Objective:** Add an `/about` page ported from `references/templates/home-about/about.jsx` (mission section + contact form) whose contact form actually sends an email via Resend through a new API route, with loading/success/error states, verified with Playwright against the running dev server.

## Scope

**In scope:**
- New page at `app/about/page.tsx`, ported from `references/templates/home-about/about.jsx`: mission hero with the three highlight badges (heart/browser/plant icons), divider banner, and a contact section (intro + tips list + form).
- Port the `.about-*` / `.contact-*` / `.highlight*` CSS rules from the template's `styles.css` into `app/globals.css` (the file already has an `/* ===== ABOUT PAGE ===== */` block started at the point the template CSS was cut off — verify what's already there vs. what's missing before appending).
- Reuse the existing scroll-reveal pattern (`IntersectionObserver` + `.reveal`/`.reveal.in`) — either extracted as a small local hook in `app/about/page.tsx` (mirroring what spec 01 already inlined in `app/page.tsx`) or copy-pasted the same way; no shared hook file, matching spec 01's "no premature abstraction" decision.
- New API route `app/api/contact/route.ts` (`POST`) that:
  - Validates `name`, `email`, `message` are present, `name`/`message` non-empty (trimmed), `email` matches a basic email-format check.
  - Sends the message via the `resend` npm package using `RESEND_API_KEY` and `CONTACT_TO_EMAIL` env vars, from `onboarding@resend.dev`.
  - Returns 400 on validation failure, 500 on Resend send failure, 200 on success.
- Contact form in `app/about/page.tsx` becomes a client component that `POST`s to `/api/contact`, with states: idle → validating (client-side shake, same as template) → sending (button shows "ENVIANDO...", disabled) → success (template's terminal-success UI) or error (inline error message, form re-enabled with input preserved).
- Add `resend` to `package.json` dependencies.
- Add an `.env.local.example` (or similar, not committed as real secrets) documenting `RESEND_API_KEY` and `CONTACT_TO_EMAIL`.
- Update `components/Nav.tsx`: add an "Acerca de" link pointing to `/about` (desktop + mobile panel), matching the template's nav (which already has this link, just needs porting to the `Link`/`isActive` pattern spec 01 established).
- Verify with Playwright MCP: page loads, reveal animations trigger, form validation (empty submit shakes), and the request path to `/api/contact` is exercised (expect it to hit the "no RESEND_API_KEY configured" error path in this environment, and confirm that surfaces as the form's error state rather than a crash).

**Not in scope:**
- Actually obtaining/configuring a real `RESEND_API_KEY` or verified sending domain — you'll add the key later; this spec only wires the integration correctly against that env var contract.
- Rate limiting, honeypot, CAPTCHA, or any other spam/abuse protection on `/api/contact`.
- Persisting submitted messages anywhere (DB, file, log table) — email-only, matching the reference template.
- Any change to `lib/scores.ts`, `/games`, `/salon`, or `/auth`.
- Custom "from" domain — uses Resend's `onboarding@resend.dev` sender.

## Data model

No persisted data types are introduced (no DB, no file storage). The only new shape is the request/response contract for the API route, kept local to the route file and the form component (not a shared `lib/` type, since it's used in exactly one place):

```ts
// app/api/contact/route.ts
type ContactRequest = { name: string; email: string; message: string };
type ContactResponse = { ok: true } | { ok: false; error: string };
```

- **Request validation errors** (400): `error` is one of `"missing_fields"`, `"invalid_email"`.
- **Send failures** (500): `error` is `"send_failed"` (Resend API error or missing `RESEND_API_KEY`/`CONTACT_TO_EMAIL` env vars — treated as a send failure rather than a distinct config-error state, since both surface identically to the user).
- The client form only needs to distinguish success vs. failure, so it doesn't need to interpret the `error` string beyond showing a generic failure message.

## Implementation plan

1. **Install dependency**: `npm install resend`. Add `.env.local.example` with:
   ```
   RESEND_API_KEY=
   CONTACT_TO_EMAIL=
   ```
   (`.env*` is already gitignored per `.gitignore`, so this documents the contract without committing secrets.)

2. **Build the API route** `app/api/contact/route.ts`: parse the JSON body, validate `name`/`email`/`message` (basic email regex, non-empty trimmed strings), return 400 `{ ok: false, error: "missing_fields" | "invalid_email" }` on failure. On valid input, construct a `Resend` client with `process.env.RESEND_API_KEY` and call `resend.emails.send({ from: "onboarding@resend.dev", to: process.env.CONTACT_TO_EMAIL, subject: ..., replyTo: email, text/html: ... })`; return `{ ok: false, error: "send_failed" }` with 500 if it throws or `RESEND_API_KEY`/`CONTACT_TO_EMAIL` are unset, otherwise `{ ok: true }` with 200. System is testable in isolation at this point via `curl`/Playwright network calls even before the page exists.

3. **Port CSS**: read the full `.about-*`/`.contact-*`/`.highlight*` block from the template's `styles.css` (it continues past what was previewed — read the rest of the file first), diff against what already exists in `app/globals.css`, and append whatever's missing, reusing existing theme variables.

4. **Build the About page** `app/about/page.tsx`: `"use client"`, port the JSX structure from `about.jsx` (hero, highlight row with the three ported `HighlightIcon` SVGs, divider, contact intro + tips, form), using a local `useReveal`-style `IntersectionObserver` effect like `app/page.tsx` already does. Replace the template's local-only `onSubmit` (which just calls `setSent`) with:
   - client-side non-empty check → shake, same as template.
   - on valid submit: set `status = "sending"`, `POST` to `/api/contact` with the form JSON.
   - on `{ ok: true }`: set `status = "success"`, render the existing terminal-success UI.
   - on `{ ok: false }` or a thrown network error: set `status = "error"`, show an inline error message under the form, re-enable the button, keep the entered `form` state so the user doesn't retype.
   - button label/disabled state reflects `status === "sending"`.

5. **Update `components/Nav.tsx`**: add an "Acerca de" `Link` to `/about` in both the desktop `.links` block and the mobile `.av-mobile-panel`, using the same `isActive("/about")` pattern as the other links.

6. **Verify with Playwright MCP**: start `npm run dev`, navigate to `/about`, confirm the hero/highlights/divider/contact sections render and reveal-in on scroll, confirm nav "Acerca de" link is active on this route, submit the form empty (expect shake, no request), submit with valid data (expect "ENVIANDO..." then an error state, since no `RESEND_API_KEY` is set in this environment) and confirm the error path renders without crashing and preserves the typed input, check browser console for unrelated errors.

7. **Run `npm run lint`** to confirm no lint errors from the new/changed files.

## Acceptance criteria

- [ ] `/about` renders the mission hero, three highlight badges, divider, and contact section with no runtime errors.
- [ ] `components/Nav.tsx` shows an "Acerca de" link to `/about` (desktop + mobile) with correct `.active` styling on that route.
- [ ] Submitting the contact form with any empty field triggers the shake animation and does **not** call `/api/contact`.
- [ ] Submitting the contact form with all fields filled calls `POST /api/contact`, shows a sending/disabled state on the button while the request is in flight.
- [ ] `POST /api/contact` with missing/empty `name`, `email`, or `message` returns 400 with `{ ok: false, error: "missing_fields" }`.
- [ ] `POST /api/contact` with a malformed `email` returns 400 with `{ ok: false, error: "invalid_email" }`.
- [ ] `POST /api/contact` with valid input but no `RESEND_API_KEY`/`CONTACT_TO_EMAIL` configured returns 500 with `{ ok: false, error: "send_failed" }`, and the About page surfaces this as an inline error state (not a crash), preserving the user's entered text.
- [ ] Once `RESEND_API_KEY`/`CONTACT_TO_EMAIL` are set to valid values (verified manually later, out of scope for this spec's automated check), a successful send shows the existing terminal-success UI.
- [ ] `resend` is listed in `package.json` dependencies; `.env.local.example` documents `RESEND_API_KEY` and `CONTACT_TO_EMAIL`.
- [ ] `npm run lint` passes with no new errors.
- [ ] Playwright MCP confirms: `/about` loads, reveal animations trigger on scroll, nav link works, empty-submit shake works, valid-submit reaches the sending state and then the error state (given no API key in this environment), no unrelated console errors.

## Decisions taken and discarded

- **Route is `/about`, not `/acerca-de`** — user's explicit choice, matching the English-route convention already set by `/games`, `/salon`, `/auth` in spec 01, despite the page's copy and CSS class names being in Spanish (`av-*`, "Acerca de" nav label kept as-is).
- **Resend over other providers (SendGrid, Nodemailer+SMTP, etc.)** — user's explicit choice; no alternatives evaluated.
- **`onboarding@resend.dev` as the sender**, not a custom verified domain — avoids blocking this spec on DNS/domain verification; can be swapped later by changing the `from` value in `route.ts`, no spec change needed.
- **`CONTACT_TO_EMAIL` and `RESEND_API_KEY` as env vars, no hardcoded destination address** — keeps the recipient out of source control; user will populate `.env.local` themselves post-implementation.
- **Loading + error states added beyond the template** — the reference `about.jsx` has no pending/failure UI since it never actually sent anything; a real network call needs both, so they're added while keeping the template's existing shake/success visuals untouched.
- **No spam/abuse protection (honeypot, rate limit, captcha)** — explicitly deferred; acceptable since this is a low-traffic personal project and can be a follow-up spec if abuse becomes a problem.
- **No server-side persistence of submissions** — matches the template's ephemeral, email-only flow; avoids introducing a database for a single feature.
- **Verification stops at the "send_failed" error path**, not an actual delivered email — no API key is available during this implementation; the user will smoke-test real delivery manually once they add `RESEND_API_KEY`.
- **`ContactRequest`/`ContactResponse` types kept local to `route.ts`**, not in a shared `lib/` file — used in exactly one place (the route and its caller), no premature abstraction.

## Identified risks

- **No end-to-end delivery verification** — since no `RESEND_API_KEY` exists yet, this spec can only prove the integration is wired correctly up to Resend's API call; a misconfigured key, wrong `CONTACT_TO_EMAIL`, or Resend account issue would only surface once the user adds real credentials and tests manually.
- **`onboarding@resend.dev` sender restrictions** — Resend's shared onboarding sender has stricter sending limits and may land in spam more often than a verified domain; acceptable for now per the decision above, but worth revisiting before any real users rely on this form.
- **CSS porting from a large template file** — `references/templates/home-about/styles.css` is long (1745 lines) and was only partially read during spec drafting; the implementation step must read the full `.about-*`/`.contact-*` block before porting to avoid missing rules or duplicating ones already partially present in `app/globals.css`.
