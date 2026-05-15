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

## License

All content and code in this repository is licensed under the GNU General Public License v3.0. See
[LICENSE](./LICENSE) for details.
