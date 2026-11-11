# erasuite.dev

[中文](README.zh-CN.md) · [erasuite.dev](https://erasuite.dev/)

This repository is the website for Era Suite: a home page and one page each for
EraMesh, EraDB and EraInfra. It also holds the code style guide that all Era
repositories follow, in [docs/style-guide.md](docs/style-guide.md).

The site is plain HTML and CSS. A Cloudflare Worker serves it with static assets. It
has no build step and no runtime dependencies, sets no cookies, and loads nothing
from other domains.

| Address | Files |
|---|---|
| [erasuite.dev](https://erasuite.dev/) | `public/index.html` |
| [mesh.erasuite.dev](https://mesh.erasuite.dev/) | `public/mesh/` |
| [db.erasuite.dev](https://db.erasuite.dev/) | `public/db/` |
| [infra.erasuite.dev](https://infra.erasuite.dev/) | `public/infra/` |

## Quick start

You need Node 22.13 or later. `.nvmrc` pins 22.23.4, which nvm, fnm and mise pick up.

```sh
git clone https://github.com/Fanzzzd/erasuite.git
cd erasuite
npm run check     # lint, format check, prose check, routing tests
npm run dev       # Worker preview at http://localhost:8787
```

`npm run dev` runs Wrangler through `npx`, so the first run downloads it. To preview
without the Worker, serve the files directly with
`python3 -m http.server -d public 8787` and open `/mesh/`, `/db/` or `/infra/`.
Subdomain routing works only under the Worker.

pnpm runs the same scripts (`pnpm check`, `pnpm dev`).

## How it works

[`src/worker.js`](src/worker.js) handles every request:

- `db.erasuite.dev/x` is served from `public/db/x`, and the same holds for `mesh` and
  `infra`. Files under `/assets/` and `/robots.txt` are shared by all hosts.
- `www.erasuite.dev` redirects to `erasuite.dev`.
- `erasuite.dev/db/...` redirects to `db.erasuite.dev/...`, and the same holds for the
  other products.
- An unknown path returns `public/404.html`.

[`test/worker.test.mjs`](test/worker.test.mjs) covers these rules with Node's
built-in test assertions and no dependencies.

## Deploy

A push to `main` runs `npm run check` in GitHub Actions and then deploys with
`wrangler deploy`, using the `CLOUDFLARE_API_TOKEN` repository secret
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)). Pull requests run
the checks only. Deploys go through this workflow only; there is no local deploy
script, so a deploy can never use the wrong Cloudflare account.

## Edit the pages

Each product page has the same sections: who it is for, what works today, how it
compares, limits, and how to get it. The pages follow three rules:

- Every fact comes from the product's own README, tests or releases. When a
  product's status changes, update its page in the same week.
- The limits section lists what does not work yet, before a reader finds out.
- A version that changes often links to the product's releases instead of being
  copied.

On the home page each product is a bed in a rock section, newest on top. A bed's
width shows its release stage: 40% in development, 70% release candidate, 100% public
releases. The `--maturity` value sets it in `public/index.html` and in the side
column of each product page, so change all four files together.

The Archivo font is self-hosted in `public/assets/fonts/` under the SIL Open Font
License ([`OFL.txt`](public/assets/fonts/OFL.txt)).

## Develop

See [CONTRIBUTING.md](CONTRIBUTING.md) for the checks and commit rules, and
[AGENTS.md](AGENTS.md) for instructions to coding agents.

## License

The code and text are MIT licensed ([LICENSE](LICENSE)). The Archivo font keeps its
own license, the SIL Open Font License 1.1.
