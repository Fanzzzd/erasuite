# erasuite.dev

The Era Suite website: a home page and one page each for EraMesh, EraDB and EraInfra.
It is plain HTML and CSS served by a Cloudflare Worker with static assets.

| Address | Files |
|---|---|
| `erasuite.dev` | `public/index.html` |
| `mesh.erasuite.dev` | `public/mesh/` |
| `db.erasuite.dev` | `public/db/` |
| `infra.erasuite.dev` | `public/infra/` |

`src/worker.js` maps each product subdomain to its folder, keeps `/assets/` shared,
redirects `www` to the root domain, and redirects `erasuite.dev/<product>` to the subdomain.

```sh
pnpm test      # routing tests
pnpm dev       # local Worker preview
pnpm deploy    # tests, then wrangler deploy
```

Pushing to `main` runs the same tests in GitHub Actions and deploys with the
`CLOUDFLARE_API_TOKEN` repository secret. Pull requests run the tests only.

For a quick look without the Worker, serve `public/` with any static server
(`python3 -m http.server -d public 8787`) and open `/mesh/`, `/db/` or `/infra/`.

The site loads nothing from other domains. The Archivo font is self-hosted in
`public/assets/fonts/` under the SIL Open Font License (`OFL.txt` next to it).

On the home page each project is a bed in a rock section, newest on top. A bed's
width is the project's release stage (40% in development, 70% release candidate,
100% public releases), set by `--maturity` in `public/index.html` and in the side
column of each product page. Change all four files together.

Product facts on each page come from that product's README. Update the page when the
product's status changes, and keep the limits section accurate.
