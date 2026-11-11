# Agent instructions

Read [README.md](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md) first.

- A push to `main` deploys to production. Push only when the owner asked for it.
- Never run `wrangler deploy` and never change `account_id` or `routes` in
  `wrangler.jsonc`, the repository secrets, DNS or email routing.
- Run `npm run check` before every commit. Keep the 8 routing cases in
  `test/worker.test.mjs` passing.
- Product facts come from the product repositories. Check a claim against that
  product's README, tests or releases before you write it on a page, and keep each
  page's limits section accurate.
- The site loads nothing from other domains and sets no cookies. Do not add
  analytics, external fonts or third-party scripts.
- When you change a page, preview it at desktop and mobile widths before you commit.
- [docs/style-guide.md](docs/style-guide.md) is the code style guide for every Era
  repository. A change to it changes the rules for EraMesh, EraDB and EraInfra too,
  so keep its file and line citations accurate.
