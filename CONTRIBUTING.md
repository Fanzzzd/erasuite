# Contributing

## Checks

Run `npm run check` before you push. It runs:

- Oxlint over `src/` and `test/`;
- the Oxfmt format check over `src/`, `test/` and `package.json` (`npm run format`
  fixes it);
- the prose check, which fails on an em dash (U+2014) in any Markdown or HTML file;
- the token check, which fails when a colour in `design/era-tokens.css` misses its
  contrast target;
- the routing tests in `test/worker.test.mjs`.

CI runs the same script, so a pass here means a pass there.

When you change a page, preview it at desktop and mobile widths with `npm run dev`,
and check keyboard focus and `prefers-reduced-motion`.

## Commits

Use Conventional Commits: `type(scope): imperative summary`, at most 72 characters.
Types: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `ci`, `build`, `chore`. The
body explains why. Make one change per commit.

## Writing

Pages and docs follow rule 9 of [docs/style-guide.md](docs/style-guide.md): short
sentences, active verbs, one name per concept, no marketing words, and no em dashes.
Product facts must match the product's own README, tests or releases.
