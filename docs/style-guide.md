# Era code style

One style for every Era Suite repository: EraMesh, EraDB, EraInfra and this site.
It records what the repositories already do, settles the places where they disagree,
and gives the smallest change that brings each repository in line.

Each rule has five parts: the rule, why, which repositories follow it, which do not
(with file and line), and the smallest change to adopt it. Conflicts come first, each
with a decision. Per-language rules and an adoption checklist per repository follow.

## Sources

The review read these checkouts on 2026-11-10. Line numbers refer to these commits.

| Product | Checkout | Commit |
|---|---|---|
| EraMesh | `~/code/personal/fastpipe` | `c1cc5ad` |
| EraDB | `~/code/personal/EraDB` | `f9706762` |
| EraInfra | `~/code/personal/erainfra` | `0cac4d5` (branch `fix/thinpool-keep-metadata-on-boot`) |
| Site | this repository | `e167c29` |

Counts such as "189 `unwrap()` calls" come from `rg` and `wc` over tracked files,
excluding vendored code and, where stated, tests. They are approximate. Nothing was
built or run.

## Decisions on conflicts

### 1. Every language has a formatter and a linter, and CI runs both

Rule: each language in a repository has a committed formatter config and linter
config, and CI fails when either reports a problem. The tools are fixed per language
(see "Per-language rules"): Oxfmt and Oxlint for TypeScript and JavaScript, rustfmt
and Clippy for Rust, gofmt and goimports through golangci-lint for Go, Ruff for
Python, ktlint for Kotlin, `swift format` for Swift, ShellCheck and shfmt for shell.

Why: a format or lint rule that only runs on one machine drifts. Every repository
already proves this for the language it does gate, and leaves the others unchecked.

Follows:
- EraDB gates TypeScript: Oxfmt (`.oxfmtrc.json:3-15`), Oxlint with `denyWarnings`
  (`.oxlintrc.json:15-21`), a type-aware pass (`.oxlintrc.type-aware.json:29-33`), run
  in CI (`.github/workflows/release-candidate.yml:45-51`).
- EraInfra gates TypeScript (`package.json:18-26`, `.oxlintrc.json:3-15`), Go lint
  (`.golangci.yml:1-16`), and Rust in `apps/mesh` with `cargo fmt --check` and Clippy
  `-D warnings` (`.github/workflows/ci.yml:277-278`).

Does not:
- EraDB has a Ruff config (`clients/python/pyproject.toml:43-48`) that nothing runs, and
  no formatter or linter for Rust (`clients/rust/Cargo.toml` has no `[lints]`), Kotlin
  (`clients/kotlin/build.gradle.kts`) or Swift.
- EraInfra never checks Go formatting: `.golangci.yml:1-16` has no `formatters:`
  section and CI runs no `gofmt`.
- EraMesh runs Clippy (`tools/validate.py:278`, `mesh/package.json:10`) but never
  `cargo fmt --check`, and has no formatter or linter for JavaScript
  (`desktop/src/main.js`), Python, Kotlin or Swift.
- The site has no formatter or linter for `src/worker.js` or `test/worker.test.mjs`.

Smallest change: add the missing config file per language (snippets below) and one
CI step per tool. Where code was never formatted, the first run is not small: EraMesh's
`cargo fmt --all` rewrites 97 of 118 Rust files. Land that commit alone, at a quiet
point, because it conflicts with every branch in progress. For EraInfra Go this is three lines in `.golangci.yml`:

```yaml
formatters:
  enable: [gofmt, goimports]
```

### 2. Logic lives once; a second implementation needs a shared fixture

Rule: behavior is implemented in one shared core. Platform code (Kotlin, Swift, a
desktop shell, a CLI) calls the core and renders its result. When two
implementations cannot be avoided, both run the same fixture file from `testdata/`,
and a change to the fixture reruns both test suites.

Why: the owner's rule is a shared core with no duplicated logic. Duplicates drift,
and each fix has to land several times.

Follows:
- EraMesh states the rule (`docs/architecture.md:3,55-61`) and keeps protocol and
  transport logic in Rust, shared through `fpmesh::app` and `mobile/ffi`.
- EraInfra implements the Docker-argument boundary twice, in Go
  (`apps/infra-agent/internal/agent/dockerargs.go`) and TypeScript
  (`apps/hub/src/runtime/dockerargs.ts`), and binds them with one fixture,
  `testdata/dockerargs-cases.json`, that Turbo hashes for both (`turbo.json:4-9`).
  This is the pattern to copy.

Does not:
- EraDB writes session, auth, value codec and query-set logic four times:
  `clients/rust/src/session.rs` (1013 lines), `clients/python/src/eradb/_client.py`
  (901), `clients/kotlin/.../Session.kt` (837), `clients/swift/Sources/EraDB/Session.swift`
  (805). Recent history applies the same fix once per language ("fix(rust): …",
  "fix(swift): …", "fix(kotlin): …").
- EraMesh passes the status view to the hosts as untyped JSON
  (`mobile/ffi/src/lib.rs:443-445`), and three hosts word it separately:
  `desktop/src/main.js:106,129-130`,
  `android/app/src/main/java/dev/fastpipe/mesh/StatusText.kt:14-30`,
  `apple/FastPipeKit/Sources/FastPipeKit/MeshStatus.swift:9-30`.

Smallest change:
- EraDB: put the wire cases for session, auth and the value codec in one
  `testdata/client-conformance/*.json` set and make all four client suites read it.
  Then record an ADR on moving Kotlin, Swift and Python onto bindings over the Rust
  client (UniFFI for Kotlin and Swift, PyO3 for Python).
- EraMesh: move the status sentences into `mesh/src/app/view.rs`, which already holds
  some of them (`view.rs:108-109`), and have the hosts display the strings they get.

### 3. One spelling of each product name in identifiers; shipped identifiers are frozen

Rule: before a product's first public release, its code uses the product name, spelled
one way: `EraDB` and `EraMesh` in type names in every language, `eradb` and `eramesh`
in package names, paths and environment variable prefixes. After release, an
identifier that a running system already holds never changes. List such frozen names
in `CONTEXT.md` and check them in CI.

Why: one name per concept. Renaming is free before the first publish and expensive
after it. EraInfra already paid that cost and wrote the freeze rule down.

Follows:
- EraInfra freezes held identifiers (`CONTEXT.md:122-124`) and checks them in CI with
  the step "No frozen runtime identifier is renamed" (`.github/workflows/ci.yml:35`).
- EraDB's Swift client uses `EraDB` (`clients/swift/Sources/EraDB/EraDBError.swift:15`).

Does not:
- EraDB spells the same name `EraDb` in Kotlin (`clients/kotlin/.../Errors.kt:60`),
  Python (`clients/python/src/eradb/_errors.py:26`) and TypeScript
  (`defineEraDbProject`, `CONTEXT.md:116`). Python's PEP 8 and Kotlin's conventions
  both capitalize a two-letter acronym, so `EraDB` also matches the languages.
- EraMesh is unreleased but its code keeps the old name: crates `fpmesh` and
  `fastpipe-desktop`, npm scope `@fastpipe/*` (`package.json:2`), bundle IDs
  `dev.fastpipe.desktop` and `productName: "FastPipe"`
  (`desktop/src-tauri/tauri.conf.json:3,5`), `dev.fastpipe.mesh`
  (`android/app/build.gradle.kts:7`). Its README keeps these on purpose
  (`README.md:5`), and its naming proposal says no final name is chosen
  (`docs/era-family-migration.md:3-5`).

Decision: rename now, before the first publish, in both repositories. EraMesh is the
final name, chosen on 2026-11-10. In camelCase identifiers the name is `eraDB` and
`eraMesh`.

Smallest change:
- EraDB: one commit renames `EraDb` to `EraDB` in TypeScript, Python and Kotlin type
  names before `0.1.0` reaches npm. The API reports show the full list. Package names
  (`eradb`, `@eradb/*`) already follow the rule.
- EraMesh: one commit renames what no running system holds:

  | Old | New |
  |---|---|
  | crates `fpmesh`, `fpmesh-ffi`, `fastpipe-desktop` | `eramesh`, `eramesh-ffi`, `eramesh-desktop` |
  | npm `fastpipe`, `@fastpipe/*` | `eramesh`, `@eramesh/*` |
  | Tauri `productName` and `identifier` | `EraMesh`, `dev.erasuite.eramesh` |
  | Android `dev.fastpipe.mesh` | `dev.erasuite.eramesh` |
  | Apple bundle IDs, Swift package `FastPipeKit` | `dev.erasuite.eramesh`, `EraMeshKit` |
  | UniFFI module `FpmeshFFI` | `EraMeshFFI` |

  The owner runs every EraMesh device, so the names a running system holds change
  too: the `fp` CLI becomes `eramesh`, `FP_*` variables become `ERAMESH_*`, and state
  paths, service names and protocol identifiers move to `eramesh`. All devices update
  together, and one script, `scripts/migrate-from-fastpipe.sh`, moves the live exit's
  state and services. The product code keeps no compatibility path for the old names.
  The script is deleted once every device has moved.

External names follow the same spelling. A GitHub App is named for its product, its
role and the GitHub account it is installed on, because its scope is that account and
every Profile of the account can use it. Environments and Profiles stay out of the
name.

| Item | Pattern | Example |
|---|---|---|
| Display name | `EraInfra <role> <owner>` | `EraInfra controller Fanzzzd` |
| Slug | `erainfra-<role>-<owner>` | `erainfra-controller-fanzzzd` |
| Private key file | `github-app-<owner>.pem` | `/etc/runner-center/github-app-fanzzzd.pem` |

The bielcrystal controller App (`erainfra-controller-bielcrystal`) already follows it.
GitHub keeps an App's client ID and installation when its name changes, so renaming
one to fit costs only the slug.

### 4. Every repository has CI that runs the local gate

Rule: CI runs on every pull request and on `main`, and it runs the same command a
contributor runs locally (`pnpm check` or the repository's validator).

Why: a gate that only runs by hand is skipped under time pressure.

Follows: EraDB (`.github/workflows/release-candidate.yml:3-7`), EraInfra
(`.github/workflows/ci.yml`), the site (`.github/workflows/deploy.yml:3-7,24`).

Does not: EraMesh has no `.github/` directory and no other CI. Its gate is
`python3 -I tools/validate.py --suite core` (`README.md:68-73`), run by hand.

Smallest change: add `.github/workflows/ci.yml` to EraMesh that runs
`python3 -I tools/validate.py --suite core` on `ubuntu-latest`, with actions pinned by
commit SHA as the site and EraInfra already do.

### 5. Source files stay under 900 lines; splits follow seams

Rule: a non-test source file has at most 900 lines, checked in CI. A file near the cap
is split where its interface is small (a deep module behind a narrow API), never by
moving its tail into a second file. Typical files in all three repositories are
120 to 230 lines; that is the target.

Why: the owner prefers small, deep modules. A cap catches god-files early. EraDB
already has the check.

Follows: EraDB enforces the cap (`scripts/maturity/check-structure.mjs:21`,
`MAX_LINES = 900`), with a median TypeScript file of 119 lines. Median files elsewhere
are also small: EraMesh Rust 226 lines, EraInfra Go 182.

Does not:
- EraDB: `packages/client/src/cell/index.ts` has 903 lines at `f9706762`, so the
  structure check should fail. Nine more files sit between 891 and 899 lines
  (for example `packages/server/src/pg/commit-batches.ts` and
  `packages/server/src/pg/cdc-source.ts`), which suggests trimming to fit rather than
  splitting.
- EraMesh: `mesh/src/node.rs` has 2500 lines; `mesh/src/tun/mod.rs` 1411,
  `mesh/src/paths.rs` 1380, `mesh/src/tun/plan/mod.rs` 1095, `mesh/src/proxy.rs` 1035,
  and the Python lab runner `bench/lab/run.py` 1552.
- EraInfra: `apps/runtime/internal/firecracker/runtime_linux.go` 1271,
  `apps/runtime/internal/gitmirror/gitmirror.go` 1034,
  `apps/erainfra-cli/internal/cli/infra.go` 1004. The first review counted only Go.
  Counting every language, as the CI check now does, finds 12 more TypeScript,
  JavaScript and Rust files over the cap, among them `packages/cli/portless.mjs` and
  the mesh `daemon.rs`. EraInfra's `scripts/check-structure.mjs` lists each one with a
  reason and fails when a listed file drops under the cap, so the list only shrinks.

EraDB's script counts `split("\n").length`, so a file that ends in a newline counts
one line more than `wc -l` shows. The effective cap is 899 lines by `wc -l`; keep the
same counting in every repository so the numbers agree.

Smallest change: copy EraDB's `check-structure.mjs` logic into a 20-line script in
each repository, wire it into CI with today's oversized files listed as exceptions,
and remove an exception when its file is split.

### 6. English only, with one exception

Rule: everything in a repository is English: code, comments, docs (internal ones too),
commit messages and UI strings. The only Chinese allowed is `README.zh-CN.md`, a
translation of `README.md`, plus test inputs that exist to test Unicode handling.

Why: English-first is the owner's rule, and one language keeps docs searchable and
reviewable by any contributor or agent.

Follows:
- EraMesh translated its design docs (commit `0fc1cc4`, "Translate the design docs
  into English") and added `README.zh-CN.md`, linked from `README.md:3`.
- EraInfra's docs, logs and commits are English. Its other CJK hits are Unicode test
  inputs (for example `apps/hub/test/chats.test.ts:80`).
- EraDB's public docs, code and commits are English.

Does not:
- EraDB has 16 internal docs with Chinese text, including `docs/HANDOVER.md`,
  `docs/PROPOSAL.md`, `docs/COMPARISON.md`, `docs/ENGINEERING.md`,
  `docs/reviews/round-1-codex.md` to `round-5-codex.md` and `docs/research/*`.
- EraInfra has one Chinese comment block, `packages/cli/portless.mjs:916-918`.

Smallest change: translate the EraInfra comment. For EraDB, delete docs that are
finished records nobody reads (handover notes, old review rounds), and translate the
rest.

### 7. Conventional Commits, one change per commit, subject under 72 characters

Rule: `type(scope): imperative summary`, at most 72 characters. Types: `feat`, `fix`,
`docs`, `refactor`, `test`, `perf`, `ci`, `build`, `chore`. The scope is a package or
app directory. The body explains why. Review-round IDs go in a trailer
(`Refs: R14-L1`), not the subject.

Why: two of the three products already use this form, and their histories are the
easiest to scan and to turn into a changelog.

Follows:
- EraDB documents it (`CONTRIBUTING.md:97-113`); 146 of its last 200 subjects comply
  and the other 53 are merges.
- EraInfra uses it in 193 of its last 200 subjects, for example
  "fix(cli): honor Retry-After on throttled requests (#256)".

Does not:
- EraMesh: 14 of its last 200 subjects use the form; 80 use a bare `area:` prefix and
  the rest none, for example "Keep established flows only on a selected or listed
  healthy exit (R14 L1)". 78 of 200 exceed 72 characters.
- EraInfra subjects average 77 characters, with a maximum of 126; 90 of the last 200
  exceed 72 even before GitHub's "(#N)" suffix. It also uses non-standard types once
  each (`image:`, `dashboard:`, `bench:`, `conformance:`, `style:`); these become scopes,
  as in `feat(image):`.
- The site: "Deploy from GitHub Actions after routing tests".

Smallest change: copy EraDB's commit section into each repository's `CONTRIBUTING.md`.
Add one CI step that checks pull request titles, since EraInfra squash-merges and the
title becomes the subject.

### 8. A fixed set of top-level docs

Rule: every repository has these files, with these names:

| File | Purpose |
|---|---|
| `README.md` | What it is, status, install, first use, limits |
| `README.zh-CN.md` | Optional Chinese translation of the README |
| `CONTEXT.md` | Domain glossary, with "Avoid" lists and frozen identifiers. No separate `GLOSSARY.md` |
| `AGENTS.md` | Agent instructions; `CLAUDE.md`, if present, only imports it |
| `CONTRIBUTING.md` | Setup, checks, commit rules |
| `ROADMAP.md` | What ships today and what is planned |
| `CHANGELOG.md` | One entry per user-visible change |
| `docs/adr/NNNN-kebab-title.md` | Architecture decisions, never rewritten once accepted |
| `LICENSE` | Required before the source is public |
| `SECURITY.md` | Required before the source is public |

Why: one name per concept, across repositories as well as inside them. A reader or
agent who knows one Era repository can find things in the others.

Follows: EraDB has all of them except `README.zh-CN.md` (`README.md:55-66`, 21 ADRs in
`docs/adr/`, `CONTEXT.md` with "Avoid" lists at `CONTEXT.md:25`). EraInfra has
`CONTEXT.md`, 18 ADRs and `LICENSE`.

Does not:
- EraMesh has no `CONTEXT.md`, `AGENTS.md`, `CONTRIBUTING.md`, `CHANGELOG.md`,
  `LICENSE` or `docs/adr/`. Its plan lives in `PROJECT.md`.
- EraInfra has no `AGENTS.md`, `CONTRIBUTING.md` or `CHANGELOG.md`. It keeps an early
  `SPEC.md` (`SPEC.md:1-8`) and has a stale path in `CONTEXT.md:41`
  (`apps/agent/index.ts:216`; the code is in `apps/action-runner-agent`).
- EraDB's `AGENTS.md` is three lines and covers only Effect.

Smallest change: EraMesh renames `PROJECT.md` to `ROADMAP.md` and adds `CONTEXT.md`,
`AGENTS.md` and `CONTRIBUTING.md`. EraInfra adds `AGENTS.md`, `CONTRIBUTING.md` (its
commit and `//nolint` rules exist only in history and config comments) and
`CHANGELOG.md`, and moves `SPEC.md` to `docs/`.

Changelogs. A repository that releases versioned packages generates `CHANGELOG.md`
with Changesets. Every pull request that changes a released package adds
`.changeset/<name>.md`, and CI fails a pull request without one
(`changeset status --since=origin/main`); internal changes add an empty changeset.
Releases run `changeset version`; nobody edits the changelog by hand. EraInfra adopts
this in Fanzzzd/erainfra#290, with its product packages in one `fixed` group. EraDB
releases 22 packages and should move to it before its first npm publish. EraMesh
releases no packages yet and keeps a hand-written `CHANGELOG.md`.

Every changelog entry, from either source:
- is written for the person who runs the software, in plain sentences;
- describes one user-visible change, so one change gets one entry;
- names the issue or pull request number when one exists;
- leaves out internal jargon and review-round IDs.

### 9. Plain writing in docs and comments

Rule: short sentences with active verbs. State limits and unshipped behavior plainly.
No marketing words, no em dashes (U+2014), no slogans as headings.

Why: the owner's writing rules apply to repository docs as much as to the site. EraDB
already states the rule.

Follows: EraDB `CONTRIBUTING.md:221-222`: "Write docs in short, direct sentences with
active verbs. State limits and unshipped behavior plainly."

Does not:
- EraInfra `README.md:3` opens with an em dash, and `README.md:12` heads a list
  "Why it holds up". `CONTEXT.md` has 28 lines with em dashes; ADRs 0002, 0004, 0005
  and 0006 have more.
- EraDB `CONTRIBUTING.md:113` prescribes a changelog heading that joins the version and
  "Unreleased" with an em dash.

Smallest change: a CI step that fails on U+2014 in `*.md`
(`! git grep -nP '\x{2014}' -- '*.md'`), and one pass replacing them with periods or
commas.

### 10. Every suppression names the rule and gives a reason

Rule: a lint suppression names the exact rule and says why on the same line. Rust uses
`#[expect(clippy::rule, reason = "...")]`, which fails once the code no longer needs
it. Go uses `//nolint:rule // reason`. TypeScript uses
`// oxlint-disable-next-line rule -- reason`. Dead code is deleted, not ignored.

Exception: a lint that fires only on some targets or in some test binaries (for
example `unnecessary_cast` only on Unix, `dead_code` only in a test binary that leaves
a shared helper unused) makes `#[expect]` fail elsewhere. Use
`#[allow(lint, reason = "...")]` there.

Why: an unexplained suppression outlives its cause and hides real findings.

Follows: EraInfra enforces it with `nolintlint` (`require-explanation`,
`require-specific`, `.golangci.yml:9-16`). EraDB: "Remove dead code instead of adding
ignore rules" (`CONTRIBUTING.md:137`).

Does not: EraMesh uses bare `#[allow(...)]` (`mobile/ffi/src/lib.rs:289`,
`mesh/tests/common/mod.rs:2`). EraDB has 13 lint-disable comments in package code with
no enforced reason.

Smallest change: Rust: set `clippy::allow_attributes_without_reason = "warn"` in
`[workspace.lints]`. TypeScript: review the 13 EraDB comments once.

### 11. Pin the toolchain and the CI actions, with the same pins across repositories

Rule: each repository pins its tools in files the tools read: `packageManager` in
`package.json`, `rust-toolchain.toml` per Rust workspace, the `go` line in `go.mod`, a
Node version file. The pnpm and Turborepo versions are the same in all repositories
and move together. GitHub Actions are pinned by full commit SHA, with the version in a
comment.

Why: a check that depends on whatever version is installed cannot be reproduced.

Follows: EraInfra pins Rust in `apps/mesh/rust-toolchain.toml` and golangci-lint in CI
(`.golangci.yml:1`), and pins actions by SHA (`.github/workflows/ci.yml`), as the site
does (`.github/workflows/deploy.yml:20-21`). Each repository pins `packageManager`.

Does not: the pnpm pins differ: EraDB `pnpm@11.17.0` (`package.json:56`), EraInfra
`pnpm@11.21.0` (`package.json:33`), EraMesh `pnpm@12.16.1` (`package.json:5`). EraDB
uses Turborepo 2.10.8, the others 2.11.10. EraMesh and EraDB have no
`rust-toolchain.toml`; EraMesh only sets `rust-version = "1.91"` (`Cargo.toml:14`).
No repository has a Node version file; EraDB names Node 22.21.1 in its docs. EraDB
refers to actions by tag, for example `actions/checkout@v4`
(`.github/workflows/release-candidate.yml:30-34`).

Decision: these pins, set on 2026-11-10, move together in all repositories.

| Tool | Pin | Where |
|---|---|---|
| pnpm | 12.18.0, the npm `latest` tag on 2026-11-10 | `packageManager` in the root `package.json` |
| Turborepo | 2.11.10 | root `devDependencies` |
| Node | 22.23.4 to run, `>=22.13.0` to install | `.nvmrc`, `engines.node` |
| Rust | 1.98.1, with every target the repository builds | `rust-toolchain.toml` |
| `actions/checkout` | `3d3c42e5aac5ba805825da76410c181273ba90b1` (v7.0.1) | workflows |
| `actions/setup-node` | `949feb2413d6458794dcd2491c4babbbce0c15c1` (v7.1.0), with `node-version-file: .nvmrc` | workflows |

The Node version lives in `.nvmrc` because every common tool reads it: nvm, fnm,
mise and `actions/setup-node`. nvm does not read `.node-version`.

pnpm 12 keeps `lockfileVersion: '9.0'`. In EraInfra the move added one leading YAML
document about pnpm itself to `pnpm-lock.yaml`, and the dependency part stayed
byte-identical. Go keeps the `go` line in each `go.mod`.

Smallest change: update the three `packageManager` fields and EraDB's Turborepo in one
sitting with `pnpm install --lockfile-only`, add `.nvmrc` and
`rust-toolchain.toml` where missing, and replace EraDB's action tags with SHAs
(Dependabot or Renovate keeps them current).

### 12. Panics are not error handling

Rule: non-test Rust code does not call `unwrap()`. `expect("...")` is allowed only
where failure is a bug, and its message says why it cannot happen. Library boundaries
(FFI, HTTP, CLI exit codes) return typed errors: `thiserror` enums marked
`#[non_exhaustive]`. `anyhow` is for binaries and tests.

Why: an `unwrap()` turns a recoverable fault into a crash of a long-running process,
which matters most in a network daemon.

Follows: EraDB's Rust client has a typed error and about 3 `unwrap`/`expect` calls
outside tests (`clients/rust/src/error.rs:9,103-105`). EraMesh's FFI uses `thiserror`
(`mobile/ffi/src/lib.rs:30,124`) and its app layer exposes stable error codes
(`mesh/src/app/error.rs:1-10`).

Does not: EraMesh has about 189 `unwrap()` and 22 `expect()` calls outside tests; 170
of the `unwrap()` calls are on lock results, and `mesh/src/node.rs` alone has about
100.

Smallest change: EraMesh's gate runs Clippy with `-D warnings`, so a `warn` lint
would fail it at once. Commit a `clippy.toml` with `allow-unwrap-in-tests = true`, and
track the count with a report that does not block
(`cargo clippy --workspace -- -A clippy::all -W clippy::unwrap_used`). Replace lock
unwraps with `expect("<name> lock poisoned")` or `parking_lot` locks. When a crate
reaches zero, set `unwrap_used = "deny"` in its `[lints.clippy]`.

### 13. Every product interface uses the Era tokens and one component look

Rule: the web interfaces (the EraInfra dashboard, the EraDB dashboard and the
EraMesh desktop app) take every colour, type size, space, radius and duration from
[`design/era-tokens.css`](../design/era-tokens.css) in this repository. Each product
keeps a byte-for-byte copy and does not edit it. A change starts here: bump the
version line, run `npm run check`, then copy the file into each product in the same
week.

- Scope: the tokens apply only to an element with `data-era-product="mesh"`, `"db"`
  or `"infra"`, which also selects the product's accent. That way the embedded EraDB
  dashboard leaves its host page alone.
- Theme: light and dark follow the system. `data-era-theme="light"` or `"dark"`
  forces one.
- Contrast: every text colour meets WCAG 2.2 AA (4.5:1) on every background of its
  theme, and strong borders meet 3:1. `design/check-tokens.mjs` checks this in
  `npm run check`.
- Colour sources: the palette is the site's. The page background is a lighter step
  of the site's paper (`--era-sunken` is the paper itself), `--era-text` is its
  ink, and each product accent is the mineral colour of its rock bed: amethyst for
  EraMesh, basalt for EraDB, olivine for EraInfra.

The component look, which every product implements the same way:

| Part | Look |
|---|---|
| Header | A 3px band in `--era-accent` along the top edge; the product name in `--era-font-display` (Archivo), weight 700; no logo image |
| Buttons | `--era-control-height`, `--era-radius`, 12px side padding, weight 500. Primary: accent fill with `--era-accent-ink`. Secondary: surface fill with a `--era-border-strong` edge. Danger: `--era-danger` |
| Inputs | Same height and radius as buttons, surface fill, `--era-border-strong` edge |
| Focus | A `--era-focus-width` outline in `--era-focus`, offset by `--era-focus-offset`, on `:focus-visible` |
| Panels | Surface fill, 1px `--era-border`, `--era-radius-lg`, no shadow. Only popups (menus, dialogs, tooltips, toasts) are raised and use `--era-shadow` |
| Tables | Muted header text in sentence case, a 1px row rule, tabular numbers |
| Status | `--era-radius-sm` badges on the `*-soft` fill with the matching status colour |
| Motion | Opacity and transform only, `--era-duration`, which drops to 0 under `prefers-reduced-motion` |

Behaviour comes from one library per stack. React apps that need popups, menus,
tabs or toasts use Vercel's UI SDK (`@ui-sdk/react` with `@ui-sdk/core`), which is
headless, so the tokens supply all of the look. It is in beta (`0.1.0-beta.1`,
published 2026-11-12), so pin it exactly and read its changelog before each bump.
Two exceptions:

- The EraDB dashboard keeps its own tested dialog and tabs. It is a library with a
  React `^18 || ^19` peer range, and UI SDK needs React 19.
- The EraMesh desktop app has no bundler. It uses native `<dialog>` and `<details>`.

Why: the four surfaces had four palettes, four font stacks and three accent blues
and greens that matched nothing on erasuite.dev. A user who moves from the site to
any product should see one family.

Follows: the site, which is the source of the palette.

Does not, at EraInfra `aa8534e`, EraDB `3ab3da13` and EraMesh `c0fb1da`
(2026-11-13): the EraInfra dashboard is a dark-only shadcn/ui theme with an emerald
accent (`apps/dashboard/src/styles.css:18-52`). The EraDB dashboard has its
own light palette with a `#2743c7` accent and a black sidebar
(`packages/dashboard/src/ui/styles.ts:5-9`). The EraMesh desktop app has a third
palette with a `#1f6f5f` accent (`desktop/src/style.css:1-15`).

Smallest change: copy the tokens file, map each app's variables onto it, and restyle
the shared parts in the table above.

## Where the repositories already agree

Keep these. They need no change.

- Test names are sentences that state behavior. EraDB: `packages/server/src/pg/cdc.test.ts:507`. EraMesh:
  `names_are_validated_and_compared_by_one_key` (`mesh/src/identity/tests/names.rs:3`).
  EraInfra: `TestScaleDownLeavesABusyRunnerToItsJob`
  (`apps/controller/internal/controller/busy_runner_cleanup_test.go:63`).
- pnpm workspaces with Turborepo in all three products (EraDB `turbo.json:4-29`,
  EraInfra `turbo.json`, EraMesh `turbo.json:22-64`).
- A domain glossary in `CONTEXT.md` that lists words to avoid (EraDB `CONTEXT.md:25`,
  EraInfra `CONTEXT.md:3-4,113-124`).
- Config files carry comments that explain why a setting exists (EraInfra
  `.golangci.yml:1-16`, `turbo.json:4-8`; EraMesh `Cargo.toml:1-5`).
- Imperative English commit subjects with no Chinese in any of the four histories.

## Per-language rules

### TypeScript and JavaScript

- Format with Oxfmt using EraDB's settings as the shared base (`.oxfmtrc.json:3-15`:
  width 100, double quotes, trailing commas, sorted imports). Oxfmt 0.75 already
  defaults to everything except `sortImports`, so stating the settings changes no
  file. Turning on `sortImports` in EraInfra reorders imports in 290 of 385 files;
  land it as its own commit.
- Lint with Oxlint, `correctness` and `suspicious` as errors, warnings denied, plus the
  type-aware pass for floating and misused promises (EraDB `.oxlintrc.json:15-21`,
  `.oxlintrc.type-aware.json:29-33`).
- `tsconfig` enables `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes` and `verbatimModuleSyntax` (EraDB
  `tsconfig.base.json:6-9`).
- File names are kebab-case. Tests sit next to the code as `*.test.ts`.
- Exported declarations have TSDoc. EraDB documents about 76% and checks API
  descriptions (`CONTRIBUTING.md:76-77`); that check is the model.
- Plain JavaScript files (EraMesh `desktop/src/main.js`, the site's `src/worker.js`)
  get the same Oxfmt and Oxlint run. They do not need TypeScript.

### Rust

- `rust-toolchain.toml` in each workspace, `[workspace.lints]` in the root
  `Cargo.toml`, and a `rustfmt.toml` that names the edition so editors agree. List
  every cross target the repository builds (iOS, Android, Windows) under `targets` in
  `rust-toolchain.toml`, so rustup installs them with the toolchain. CI reads the same
  file instead of naming a version.
- Turborepo hashes only declared inputs. List `rustfmt.toml`, `clippy.toml` and
  `rust-toolchain.toml` in `turbo.json` `globalDependencies`, or a cached lint result
  survives a config change.
- CI: `cargo fmt --check`, `cargo clippy --locked --all-targets -- -D warnings`,
  `cargo test --locked`, `cargo deny --locked check`. EraInfra `apps/mesh` already runs
  all four (`.github/workflows/ci.yml:277-283`).
- Lints in `[workspace.lints]`: `clippy.allow_attributes_without_reason`,
  `rust.missing_docs` for library crates, and `clippy.unwrap_used` (rule 12). With
  Clippy run as `-D warnings`, a lint added at `warn` blocks the gate, so add each one
  only when the code already passes it. EraMesh documents about 59% of public items, EraDB's Rust client
  646 `///` lines for 82 public items.
- Errors: rule 12.
- Unit tests in a sibling `tests` module (`mod tests;`), integration tests in
  `tests/`, shared helpers in `tests/common/mod.rs`, as EraMesh does
  (`mesh/src/state/mod.rs:188`, `mesh/tests/common/mod.rs`).

### Go

- gofmt and goimports through golangci-lint `formatters` (rule 1), on top of
  EraInfra's linters and `nolintlint` (`.golangci.yml:1-16`).
- Package names are one short lowercase word (EraInfra `cacheindex`, `netpolicy`).
  Acronyms are all capitals in identifiers (`RepositoryID`, `CacheServiceURL`); JSON
  tags follow the wire format.
- Wrap returned errors with `%w`. EraInfra wraps 452 of 786 `fmt.Errorf` calls; the
  rest either add no cause or should wrap. Use sentinel errors and `errors.Is` for
  conditions callers branch on.
- Log with `log/slog`. EraInfra uses `slog` in 13 files, stdlib `log` in 5 and logrus
  in `apps/runtime/internal/firecracker/runtime_linux.go`; move the last six to `slog`.
- Tests: table-driven where cases share a shape, fixtures in `testdata/`, golden files
  refreshed with `-update` (EraInfra
  `apps/erainfra-cli/internal/runsonmigrate/golden_test.go:17,178`).
- Every package has a `// Package x ...` comment. EraInfra has one in 38 of 51
  packages. Exported identifiers have doc comments that start with the name.

### Python

- Ruff for formatting and linting, run in CI. Start from EraDB's config
  (`clients/python/pyproject.toml:43-48`).
- Tests run under pytest. Scripts run with `python3 -I`, as EraMesh does
  (`tools/validate.py`, `bench/package.json:9`).

### Kotlin

- ktlint 1.8.0 through the `org.jlleitschuh.gradle.ktlint` plugin, run in CI as
  `ktlintCheck`. Use the `intellij_idea` style at 120 columns: it matches the
  `kotlin.code.style=official` setting the projects already declare, and it
  reformatted 16 EraDB files where `ktlint_official` would have rewritten 33.
- Library modules use `explicitApi()`, as EraDB does
  (`clients/kotlin/build.gradle.kts:20`).
- Errors are a sealed exception hierarchy (EraDB `Errors.kt:60-87`).

### Swift

- `swift format` (it ships with the Swift 6 toolchain, so nothing to install), run in
  CI with a committed `.swift-format`. Indent with 2 spaces, the tool's default and
  what EraDB's Swift client uses; EraDB's `Sources` pass `swift-format lint --strict`
  with no findings.
- Strict concurrency on (EraDB `Package.swift:21`). One `Package.swift` per package:
  EraDB keeps two in step by hand (`Package.swift:7-8`). Where two must exist, make
  one the source of truth and fail CI on drift: EraDB compares both through
  `swift package dump-package` in `scripts/ci/check-swift-manifests.mjs`.

### Shell and PowerShell

- ShellCheck and shfmt in CI; scripts start with `set -eu`. EraInfra already runs
  ShellCheck inside its suites (`.github/workflows/ci.yml:158,180`).
- PowerShell gets PSScriptAnalyzer. EraInfra only parse-checks it today
  (`.github/workflows/ci.yml:169`).

### HTML and CSS

- Product interfaces follow rule 13. Each one ships its fonts and loads nothing from
  other domains.
- The site is plain HTML and CSS, with no framework and no build step. It makes no
  requests to other domains: fonts are self-hosted under `public/assets/fonts/`.
- Every page has a skip link, visible focus, and motion only inside
  `prefers-reduced-motion: no-preference`.
- Product facts come from that product's README and are updated when its status
  changes (`README.md`).

### All files

A shared `.editorconfig` at each repository root. None of the four had one; the site
now does:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.{rs,py,kt,kts}]
indent_size = 4

[{*.go,Makefile}]
indent_style = tab

[*.md]
trim_trailing_whitespace = false
```

## Adoption checklist

Ordered by value per unit of effort. The first items take minutes.

Status on 2026-11-11:

| Repository | State |
|---|---|
| EraDB | Every item is on `convex-maturity` except shared client conformance fixtures with their ADR (item 7) and the move to Changesets (item 10). |
| EraInfra | Every item is on `main`: Fanzzzd/erainfra#291, #294, #296, #297, #298 and #299, plus the README rewrite in #300 and #301. |
| EraMesh | Items 1 to 6 and the code-level rename are on `feat/quic-connection-resilience`. The runtime rename waits on branch `era/rename-runtime` for one planned production migration with `scripts/migrate-from-fastpipe.sh`. Items 7 and 9 (status wording in one place, splitting `mesh/src/node.rs`) are open. |
| Site | Done. |

### EraMesh

1. Add `.github/workflows/ci.yml` running `python3 -I tools/validate.py --suite core`
   (rule 4). It has no CI today.
2. Add `cargo fmt --check` to `core_commands()` in `tools/validate.py` and commit an
   empty `rustfmt.toml` (rule 1).
3. Move to pnpm 12.18.0, add `.nvmrc` and a `rust-toolchain.toml` for 1.98.1
   that lists the iOS, Android and Windows targets, and point CI at it (rule 11).
4. Add `clippy.toml` with `allow-unwrap-in-tests = true` and a non-blocking
   `unwrap_used` report; deny the lint per crate once its count is zero (rule 12).
5. Add `.editorconfig`, `AGENTS.md`, `CONTRIBUTING.md` with the commit rules, and
   rename `PROJECT.md` to `ROADMAP.md` (rules 7 and 8).
6. Add `LICENSE` with the MIT text EraInfra uses, and `license = "MIT"` in the
   manifests (rule 8).
7. Move status wording into `mesh/src/app/view.rs` (rule 2).
8. Rename every identifier to EraMesh, including the CLI, environment variables,
   state paths and protocol identifiers, and move the live exit with the migration
   script (rule 3).
9. Split `mesh/src/node.rs` along its seams (rule 5).
10. Restyle `desktop/src` on the Era tokens (rule 13).

### EraDB

1. Bring `packages/client/src/cell/index.ts` under 900 lines; the structure gate
   should be failing (rule 5).
2. Run Ruff in CI using the existing config (rule 1).
3. Add `cargo fmt --check` and Clippy for `clients/rust`, ktlint for
   `clients/kotlin`, and `swift format` for `clients/swift` to CI (rule 1).
4. Replace the em dash in `CONTRIBUTING.md:113`, add the U+2014 check, and remove the
   blank line that breaks the ADR index table (`docs/adr/README.md:29-30`) (rule 9).
5. Translate or delete the 16 internal docs with Chinese text (rule 6).
6. Rename `EraDb` to `EraDB` in TypeScript, Python and Kotlin before `0.1.0` is
   published (rule 3).
7. Add shared client conformance fixtures, then write the ADR on bindings over the
   Rust client (rule 2).
8. Generate the root `Package.swift` from `clients/swift/Package.swift`, or drop one
   (Swift rules).
9. Pin GitHub Actions by commit SHA instead of tags, move to pnpm 12.18.0 and
   Turborepo 2.11.10, and add `.nvmrc` (rule 11).
10. Move the changelog to Changesets before the first npm publish (rule 8).
11. Restyle `packages/dashboard` on the Era tokens (rule 13).

### EraInfra

1. Add `formatters: enable: [gofmt, goimports]` to `.golangci.yml` (rule 1).
2. Fix the stale path in `CONTEXT.md:41` and translate the comment at
   `packages/cli/portless.mjs:916-918` (rules 6 and 8).
3. Copy EraDB's Oxfmt settings into `.oxfmtrc.json` (TypeScript rules).
4. Add `AGENTS.md` and `CONTRIBUTING.md`, and move `SPEC.md` to `docs/`. Generate
   `CHANGELOG.md` with Changesets (Fanzzzd/erainfra#290) instead of writing it by
   hand (rule 8).
5. Add a pull request title check limited to 72 characters (rule 7).
6. Replace em dashes in `README.md`, `CONTEXT.md` and the ADRs, rewrite the
   "Why it holds up" heading as plain text, and add the U+2014 check (rule 9).
7. Move the logrus and stdlib `log` call sites to `log/slog` (Go rules).
8. Split `runtime_linux.go`, `gitmirror.go` and `cli/infra.go` (rule 5).
9. Move to pnpm 12.18.0 and add `.nvmrc` (rule 11).
10. Restyle `apps/dashboard` on the Era tokens, and replace Radix and sonner with
    UI SDK (rule 13).

### Site

Done: `.editorconfig`, self-hosted fonts, this guide, Conventional Commits, `LICENSE`,
`AGENTS.md`, `CONTRIBUTING.md`, `README.zh-CN.md`, `.nvmrc`, and one `npm run check`
script (Oxlint, Oxfmt, the em dash check, routing tests) that CI runs as-is. The site
releases nothing and has no domain model, so it skips `CONTEXT.md`, `ROADMAP.md`,
`CHANGELOG.md`, `docs/adr/` and `SECURITY.md` (rule 8).
