# Mira repository rules

## Product handbook

Start with [Mira Handbook](docs/handbook/README.md), then read
[current decisions](docs/handbook/product/decisions.md) and
[implementation status](docs/handbook/engineering/current-state.md) before product work.
Distinguish accepted decisions, proposals, research observations, and implemented behavior.
Update the canonical handbook chapter when its behavior or decision changes; legacy files in
`docs/` are redirect pages. Follow the [maintenance guide](docs/handbook/maintenance/handbook-guide.md)
when adding research, specifications, or decision records. Write handbook content in Vietnamese.

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
