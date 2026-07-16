# AGENTS.md — Video Studio

A small **marketing-video script studio**. It renders a browsable catalog of
video projects → videos → scenes, estimates each scene's duration from the
script, plays scripts back on a teleprompter, and lets reviewers attach notes,
votes, and production verifications (those live in PocketBase, see below).

The app itself is finished. **Your job is almost always to edit the content, not
the app.**

---

## ⭐ The one rule

> **Edit only [`src/data/videos.ts`](./src/data/videos.ts).**

That single file is the entire content of the studio. Add/remove/rewrite
projects, videos, and scenes there and the whole UI, routing, duration math, and
teleprompter update automatically. You should **not** need to touch any other
file to add or change videos.

The rest of the repository (Astro pages, React components, router, PocketBase
client, styles) is shipped **only so the app can be customized if someone
explicitly asks**. Unless the task is "change how the app looks/works," stay in
`videos.ts`.

---

## The data model (everything is in `videos.ts`)

The file exports one array, `videoProjects: VideoProject[]`. The shape:

```
VideoProject          // a brand / campaign bucket
 ├─ id                 // stable unique string
 ├─ name               // display name
 ├─ slug               // URL segment → /:slug   (must be unique, url-safe)
 ├─ description?       // one-liner shown on cards
 └─ videos: Video[]
     ├─ id             // stable unique string (used as PocketBase key — do not reuse)
     ├─ title
     ├─ slug           // URL segment → /:projectSlug/:videoSlug  (unique within the project)
     ├─ type           // "camera" | "screen" | "ai"  → drives icon + which verifications apply
     ├─ brief?         // context note for the person reading/producing it
     └─ scenes: Scene[]
         ├─ id         // unique within the video (used as note key)
         ├─ title
         └─ script     // the spoken line + bracketed directions (see syntax below)
```

Rules of thumb when editing:

- **`id`s are identity.** Notes, votes, and verifications in PocketBase are keyed
  by `video.id` (and `scene.id`). Renaming or reusing an `id` silently detaches
  existing review data. Add new ones; don't recycle old ones.
- **`slug`s are URLs.** Keep them unique and url-safe (`lowercase-with-dashes`).
  `slug` uniqueness is per-scope: project slugs globally, video slugs within
  their project.
- **`type`** is one of exactly `camera` (🎥), `screen` (🖥️), or `ai` (🤖). It
  selects the emoji/badge *and* the verification checklist shown for that video.
- Scenes are shipped read-only in the UI — reviewers annotate them, they don't
  edit them. So the scene text you write is what they produce from.

### Script direction mini-syntax

Scene `script` is plain text plus **bracketed directions**. The parser
([`src/lib/script.ts`](./src/lib/script.ts)) reads them to estimate duration and
to highlight them in the UI. You don't call the parser — just write the brackets
and durations compute themselves (~130 wpm + explicit pauses).

| You write | Meaning | Effect on timing |
| --- | --- | --- |
| `[pause 2s]`, `[break 1.5]`, `[3s]` | explicit silence | **adds** those seconds |
| `[warm]`, `[serious]`, `[calm]`, `[curious]`… | emotion cue | 0s (styling only) |
| `[emphasis]`, `[bold]`, `[clear]`, `[slow]`, `[fast]` | cadence cue | 0s (styling only) |
| `*[manos escanean un QR]*` | **stage / visual cue** (wrap in `*…*`) | 0s, and the text is **not** spoken — it's removed from the word count |
| `[anything else]` | generic note | 0s |

Spoken word count drives the base duration; only `pause`/`break`/`Ns` brackets
(and pauses embedded in a stage cue) add time. Keep this syntax when writing new
scenes so the duration estimates stay meaningful.

### Verification definitions (edit rarely)

The bottom of `videos.ts` also exports `verificationDefinitions` — the
production checklist per `type` (URL live, features working, talent briefed,
etc.). These are stable across campaigns; only change them if the review process
itself changes. Adding a new checklist item is safe (it starts "pending");
removing one hides its history in the UI.

---

## Architecture (for the customization case only)

Standard Astro standalone app — nothing exotic:

- **Astro 7** + **Node standalone adapter** (`astro.config.mjs`), server-rendered
  (`prerender = false`).
- **React 19 islands** — the whole app is one client island mounted from
  [`src/pages/[...path].astro`](./src/pages/[...path].astro) via
  `<VideosRoot client:only="react" />`.
- **wouter** for client-side routing (`/`, `/:project`, `/:project/:video`,
  `/:project/:video/play`) — see [`src/app/VideoApp.tsx`](./src/app/VideoApp.tsx).
- **Tailwind CSS v4** via the Vite plugin ([`src/styles/global.css`](./src/styles/global.css)),
  **lucide-react** icons, shadcn-style conventions (`components.json`, `lib/utils.ts`).
- Duration/teleprompter logic in `src/lib/` (`script.ts`, `script.timeline.ts`,
  `speed.ts`). The player is `src/app/VideoPlayer.tsx` / `PlayPage.tsx`.

```
src/
├─ data/videos.ts        ← 99% of edits happen here
├─ pages/
│  ├─ [...path].astro     ← mounts the React app for every route
│  └─ pb/[...all].astro   ← always 404s /pb/* when served standalone (proxy handles it in Studio)
├─ app/                   ← screens: catalog, video page, teleprompter player
├─ components/VideosRoot  ← <PBProvider> + <VideoApp>
├─ lib/                   ← script parsing, timeline, PocketBase client + hooks
└─ styles/global.css
```

---

## The only dependency: PocketBase

Everything else is a normal Astro standalone project. The **one** external
dependency is a **PocketBase** database, used for reviewer notes, votes, and
verification status. The client is created in
[`src/lib/pb.tsx`](./src/lib/pb.tsx).

- **URL:** `import.meta.env.PUBLIC_PB_URL`, defaulting to **`/pb`**.
- **In the LexGuard Studio container** (the intended home), a PocketBase
  instance ships alongside the app and is proxied at `/pb` — so it works with
  **zero config**. (`src/pages/pb/[...all].astro` returns 404 only when there's
  no proxy in front, i.e. standalone runs.)
- **Anywhere else**, point it at your own PocketBase by setting `PUBLIC_PB_URL`
  (e.g. `PUBLIC_PB_URL=https://my-pb.example.com`).
- **If PocketBase can't be reached**, the app doesn't render a broken shell — it
  shows a "PocketBase unavailable" screen with instructions and a retry button
  (`PBProvider` health-checks on mount). The catalog/notes/votes require the DB;
  that's by design.

Collections the app expects (provided by the Studio container): `video_notes`,
`video_votes`, `video_status`, `video_verifications`. You normally don't manage
these — the container does.

---

## Dev commands

Start the dev server in **background mode**:

```
astro dev --background
```

Manage it with `astro dev stop`, `astro dev status`, `astro dev logs`.

| Command | Action |
| --- | --- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Dev server at `localhost:4321` |
| `pnpm build` | Production build to `./dist/` |
| `pnpm preview` | Preview the build |
| `pnpm check` | Typecheck (`tsc --noEmit`) |

After editing `videos.ts`, run `pnpm check` to confirm the data still typechecks.
