# Ads Studio — client-ready Meta Ads plans

**Turn a Meta Ads strategy into a link you can send a client.**

Ads Studio takes the plan a media buyer or strategist would normally bury in a
Google Doc, a spreadsheet, and a slide deck — and renders it as one clean,
interactive web page per client. Strategy, campaigns, every ad's creative brief,
the budget, the launch calendar, and the day-by-day decision rules all live in a
single shareable URL.

Built for **agencies** who run paid social for multiple clients and are tired of
rebuilding the same messy deck every time.

---

## What is this for?

You just scoped a Meta Ads engagement. Now you have to (a) sell the plan to the
client, (b) hand a clear brief to whoever produces the creative, and (c) actually
launch and manage it. Today that's three different documents that immediately go
out of sync.

Ads Studio is the single source of truth for all three:

- **Sell it** — the client opens a link and sees a polished, on-brand plan:
  the thesis, the angles you're testing, the budget, and what success looks like.
  No "let me export the deck."
- **Brief it** — every ad already carries its format, aspect ratio, hook,
  primary text, CTA, destination, and UTM parameters. Your editor/designer has
  everything they need with zero back-and-forth.
- **Run it** — a spend timeline, a launch runbook, and explicit decision rules
  ("day 3: kill any ad under X") turn the plan into an operating manual for the
  first weeks of the campaign.

One repo hosts **many client plans at once** — each is its own page, all reachable
from a shared hub. It's how an agency keeps every active account documented in one
place.

## Who it's for

- **Paid-social agencies & freelancers** managing Meta (Facebook/Instagram) Ads
  for several clients.
- **Strategists / media buyers** who need a repeatable way to present and hand
  off a plan.
- **Studios launching their own products** — the included plans (Nei Digital,
  LexGuard, Aprandr, Detalle Digital, Notal) are real examples you can clone.

## What's in a plan

Each campaign plan is a scrollable page with these sections:

| Section | What it holds |
| :--- | :--- |
| **Resumen** | Account, success criteria, offer/pricing at a glance |
| **Principios** | The operating rules the campaign is built on |
| **Tesis** | The hypotheses you're testing (hypothesis · metric · insight) |
| **Campañas** | Each campaign: objective, budget, destination, creative angles |
| **Anuncios** | Every ad — pillar, problem, hook, full creative spec, UTMs |
| **Cronograma** | Ad-set assignments + a day-by-day spend timeline |
| **Presupuesto** | Budget breakdown, regular vs. offer pricing |
| **Lanzamiento** | Step-by-step launch runbook |
| **Pendientes** | Open items before go-live |

A floating side-nav jumps between sections and scroll-spies the active one, so a
client can navigate a dense plan without getting lost.

## How you use it — content, not code

**You almost never touch the app.** Everything is data-driven from
[`src/data/`](./src/data/):

- Each client plan is one file (e.g.
  [`src/data/metaAdsPlan.ts`](./src/data/metaAdsPlan.ts)) typed against the shared
  shapes in [`src/data/interfaces.ts`](./src/data/interfaces.ts).
- [`src/data/navigation.ts`](./src/data/navigation.ts) is the single registry:
  add an entry there and the plan automatically becomes a **card on the home hub**,
  a **navbar link**, and a **route at `/{slug}`**.

To add a client: copy an existing plan file, fill in the campaigns/ads/budget,
and register it in `navigation.ts`. No component work required.

## Quickstart

```sh
pnpm install
pnpm dev        # → http://localhost:4321
```

| Command | Action |
| :--- | :--- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Dev server at `localhost:4321` |
| `pnpm build` | Production build to `./dist/` |
| `pnpm preview` | Preview the production build |
| `pnpm check` | Typecheck (`tsc --noEmit`) |

## Tech

A standalone **Astro** app (React 19 + Tailwind v4 + wouter for client-side
routing). No database, no backend — a plan is pure content, so the whole thing
builds to static output you can host anywhere.

## Project structure

```text
src/
├─ data/            ← all content: one file per client plan + navigation registry
├─ components/      ← the plan renderer (MetaAdsPlanPage + section components)
├─ app/             ← React app shell + routing (hub, plan route, 404)
├─ pages/           ← Astro entry route
├─ lib/             ← shared utilities
└─ styles/
```
