# Video Studio

A marketing-video **script studio**: a browsable catalog of video projects →
videos → scenes, with automatic duration estimates, a teleprompter playback
mode, and reviewer notes / votes / production verifications.

It's a normal Astro standalone app (React + Tailwind + wouter). Its **only**
external dependency is a PocketBase database.

> **Editing content?** You almost certainly only need to touch
> [`src/data/videos.ts`](./src/data/videos.ts). See **[AGENTS.md](./AGENTS.md)**
> for the data model and the script syntax — it's the source of truth for both
> humans and agents working in this repo.

---

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

## Project structure

```text
src/
├─ data/videos.ts    ← all content: projects, videos, scenes, verifications
├─ pages/            ← Astro entry route + /pb catch-all
├─ app/              ← React screens (catalog, video page, teleprompter)
├─ components/       ← app root
├─ lib/              ← script parsing + PocketBase client & hooks
└─ styles/
```

All content lives in `src/data/videos.ts`; the UI, routing, and duration math
derive from it. Full details in [AGENTS.md](./AGENTS.md).

## The one dependency: PocketBase

Reviewer notes, votes, and verification status are stored in **PocketBase**.

- The client URL is `PUBLIC_PB_URL`, defaulting to **`/pb`**.
- **In the LexGuard Studio container** (the intended deployment target) a
  PocketBase instance ships alongside the app and is proxied at `/pb` — it works
  with zero configuration.
- **To run against your own database**, set the env var:

  ```sh
  PUBLIC_PB_URL=https://your-pocketbase.example.com pnpm dev
  ```

- If PocketBase can't be reached, the app shows a clear "PocketBase unavailable"
  screen (with a retry button) instead of a broken UI.

Everything else behaves like a standard Astro standalone project.

## Learn more

- [Astro documentation](https://docs.astro.build)
- [PocketBase documentation](https://pocketbase.io/docs/)
