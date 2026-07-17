# Video Studio — script, review & shoot marketing videos

**Everything that happens to a marketing video *before* it's edited, in one place.**

Video Studio is a browsable catalog of your video projects → videos → scenes. It
estimates how long each script will run, plays scripts back on a built-in
teleprompter for the shoot, and lets your team and clients leave notes, cast
votes, and sign off production checklists on every scene.

Built for **agencies** producing video content for clients — so the scripting,
approval, and shooting stages stop living in a pile of disconnected Google Docs.

---

## What is this for?

Video is the highest-effort content an agency ships, and the messiest to
coordinate. A script is in one doc, feedback is in the comments of another, the
"is this approved?" answer is in Slack, and on shoot day someone is reading off
their phone.

Video Studio collapses that into one workflow:

- **Write** — organize scripts as projects → videos → scenes. Each scene is a
  spoken line plus bracketed stage directions.
- **Estimate** — the studio reads each script and estimates its runtime
  automatically, so you know a video's length before anyone hits record.
- **Review & approve** — reviewers attach notes, vote, and tick off
  production-verification checklists per scene. Approval status is visible, not
  buried in a thread.
- **Shoot** — a **teleprompter playback mode** scrolls the script at a set pace
  so on-camera talent (or a screen recording) can read straight from it.

The result: a single link that shows a client exactly what a video will say and
how long it'll run — and gives your team a clear, tracked path from draft to
"ready to film."

## Who it's for

- **Content & video agencies** producing camera, screen-recording, or AI-avatar
  videos for clients.
- **Creators / founders** running their own content pipeline who want structure
  around scripting and review.
- **Producers** who need runtime estimates and sign-off before booking a shoot.

## Video types

Each video is tagged as one of three types, which drives its icon **and** the
production checklist it's reviewed against:

- 🎥 **camera** — talent-on-camera shoots
- 🖥️ **screen** — screen recordings / demos
- 🤖 **ai** — AI-avatar / generated video

## How you use it — content, not code

**The app is finished; your job is almost always to edit the content.** The
entire studio is driven by one file:

> **[`src/data/videos.ts`](./src/data/videos.ts)** — add, remove, or rewrite
> projects, videos, and scenes here and the whole UI, routing, duration math, and
> teleprompter update automatically.

The data model and the script syntax (how to write spoken lines vs. bracketed
directions) are documented in **[AGENTS.md](./AGENTS.md)** — the source of truth
for both humans and agents working in this repo. You should not need to touch any
other file to manage videos.

## The one dependency: PocketBase

Reviewer notes, votes, and verification status are stored in **PocketBase** (a
lightweight database). Everything else is static.

- The client URL is `PUBLIC_PB_URL`, defaulting to **`/pb`**.
- In the intended deployment (the LexGuard Studio container) a PocketBase
  instance ships alongside the app and is proxied at `/pb` — zero config.
- To run against your own database:

  ```sh
  PUBLIC_PB_URL=https://your-pocketbase.example.com pnpm dev
  ```

- If PocketBase can't be reached, the app shows a clear "PocketBase unavailable"
  screen with a retry button instead of a broken UI.

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

A standalone **Astro** app (React + Tailwind + wouter). Its only external
dependency is a PocketBase database for review data.

## Project structure

```text
src/
├─ data/videos.ts   ← all content: projects, videos, scenes, verifications
├─ pages/           ← Astro entry route + /pb catch-all
├─ app/             ← React screens (catalog, video page, teleprompter)
├─ components/      ← app root
├─ lib/             ← script parsing + PocketBase client & hooks
└─ styles/
```

## Learn more

- [Astro documentation](https://docs.astro.build)
- [PocketBase documentation](https://pocketbase.io/docs/)
