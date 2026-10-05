# Mira repository rules

## Product documentation

Start with [module documentation](docs/modules/README.md), then read
[current decisions](docs/handbook/product/decisions.md) and
[implementation status](docs/handbook/engineering/current-state.md) before product work.
The [Mira Handbook](docs/handbook/README.md) remains the source for topics not yet migrated.
For a migrated module, update its canonical chapter in `docs/modules/` and leave a short pointer
in the handbook when an old chapter is still a common entry point. Distinguish accepted decisions,
proposals, research observations, and implemented behavior. Follow the
[maintenance guide](docs/handbook/maintenance/handbook-guide.md) when adding research,
specifications, or decision records. Write product documentation in Vietnamese.

## Checks

Run `node scripts/check.mjs` before committing and `node scripts/check.mjs --build` before pushing. It
runs the typecheck (node and web projects), the tests, and lint, and a step that shows no evidence it
ran counts as a failure. The tests run in two phases because five files assert on wall-clock time and
fail when 60 files compete for the CPU; see the comments at the top of the script.

Do not trust `pnpm test`, `pnpm lint` or `pnpm typecheck` when the global pnpm is newer than the pinned
`packageManager` (pnpm 8.9.0): they can print a warning and exit 0 without running anything. For the same
reason do not run `pnpm add` or `pnpm install` with such a pnpm; it rewrites `pnpm-lock.yaml` from
lockfileVersion 6.0 to 9.0.

## Commits

Follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) with the type set from `@commitlint/config-conventional`. Write commit messages in English.

```text
<type>(<scope>)!: <description>

[body — why the change was made, not what changed]

[footer(s)]
```

**Types** (lowercase):

| Type | Use for |
| --- | --- |
| `feat` | A new feature |
| `fix` | A bug fix |
| `perf` | A performance improvement with no behavior change |
| `refactor` | Restructuring that neither adds a feature nor fixes a bug |
| `style` | Formatting, whitespace, semicolons; visual/CSS changes are `feat` or `fix` |
| `test` | Adding or correcting tests |
| `docs` | Documentation only |
| `build` | Build system or dependencies |
| `ci` | CI configuration |
| `chore` | Other changes that do not touch source code or tests |
| `revert` | Reverting a previous commit |

**Scope** is optional and names a part of Mira. Start with `editor`, `segments`, `alignment`, `library`, `storage`, `ui`, `research`, or `docs`; add scopes as modules appear.

**Description:** use the imperative mood ("add", "fix", "remove"), start with a lowercase letter, and omit the trailing period. Keep the entire header at most 72 characters. Keep body and footer lines at most 100 characters. Separate header, body, and footers with blank lines.

For a breaking change, add `!` before `:` and/or a `BREAKING CHANGE: <description>` footer.

Make one logical change per commit. If a change fits two types, split it into two commits. Never add `Co-Authored-By: Claude` or "Generated with Claude Code".

Examples:

```text
docs: record Mira product decisions
feat(editor): add full-text source view
fix(alignment): preserve links after splitting a segment
refactor(storage)!: move projects into separate databases

BREAKING CHANGE: existing library databases need migration.
```

These rules guide commit messages and scope. The repo has no commitlint hook while the application tooling is being replanned.
