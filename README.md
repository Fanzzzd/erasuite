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

Product facts on each page come from that product's README. Update the page when the
product's status changes, and keep the limits section accurate.
