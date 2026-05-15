# portfolio

A static, desktop-OS style portfolio built with Next.js 15 (App Router + static
export). Inspired by [daedalOS](https://github.com/DustinBrett/daedalOS) — much
smaller scope, content-first.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run gen:projects   # rebuild lib/projects.generated.ts from content/projects/*.mdx
npm run lint
npm run typecheck
npm run test           # vitest (jsdom)
npm run build          # produces ./out (static export)
```

## Content authoring

- **About / Resume / Skills** — edit `content/about.mdx`, `content/resume.mdx`,
  `content/skills.json`.
- **Projects** — copy `content/projects/_template.mdx` to a new file. The
  generator validates frontmatter and rebuilds the static manifest on every
  `dev`/`build`/`typecheck`/`test`.

See [`docs/mdx-pipeline.md`](../docs/mdx-pipeline.md) for full details.

## Architecture

The site mounts one client-side "OS shell" at `/`:

- **Window manager** — Zustand store + custom drag/resize hooks. No
  `react-rnd`. See [`docs/window-manager.md`](../docs/window-manager.md).
- **App registry** — single source of truth for every window-able app. See
  [`docs/app-registry.md`](../docs/app-registry.md).
- **MDX pipeline** — build-time generator pulls frontmatter and emits a
  static manifest. See [`docs/mdx-pipeline.md`](../docs/mdx-pipeline.md).
- **Mobile fallback** — CSS-swap to a linear list view under 768 px. See
  [`docs/mobile.md`](../docs/mobile.md).

Deployment: [`docs/deployment.md`](../docs/deployment.md).

For contributor conventions (and Copilot agent guidance), read
[`.github/copilot-instructions.md`](../.github/copilot-instructions.md).

## License

MIT.
