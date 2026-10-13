## Purpose

Định nghĩa adapter Kakuyomu fixture-first dùng stable work/episode IDs, fail-closed khi schema thay đổi và
chỉ được quảng bá tới người dùng sau release gate riêng.

## ADDED Requirements

### Requirement: Kakuyomu URLs have canonical stable identity

The Kakuyomu adapter MUST identify only canonicalizable HTTPS work and episode URLs on the exact
`kakuyomu.jp` origin and MUST use source ID `mira.jp.kakuyomu`.

#### Scenario: Work URL is identified
- **WHEN** the user supplies `https://kakuyomu.jp/works/{positiveNumericWorkId}`
- **THEN** identify returns the numeric `remoteWorkId`, canonical work URL and no input episode ID

#### Scenario: Episode URL is identified at work scope
- **WHEN** the user supplies
  `https://kakuyomu.jp/works/{positiveNumericWorkId}/episodes/{positiveNumericEpisodeId}`
- **THEN** identify returns the work ID, canonical work URL and the input episode ID for preview highlighting

#### Scenario: Ambiguous or lookalike URL is rejected
- **WHEN** the URL uses another protocol, subdomain, non-default port, credentials, malformed ID, unknown
  path shape or identity-changing query data
- **THEN** identify returns no match or a safe validation error without a network request

### Requirement: Work metadata comes from validated embedded state

The adapter MUST parse work identity, title, author, description and language `ja` from the expected
embedded state and MUST verify that embedded work identity equals the requested work ID.

#### Scenario: Valid synthetic work state is parsed
- **WHEN** `__NEXT_DATA__` contains the expected work and referenced author entities
- **THEN** the adapter returns normalized metadata for the requested work

#### Scenario: Embedded work identity differs
- **WHEN** the page state refers to another work ID or lacks required work roots
- **THEN** the adapter returns `parser_broken` or an inconclusive result and produces no preview snapshot

### Requirement: Catalog traversal follows stable Apollo references

The adapter MUST traverse `tableOfContentsV2`, chapter and episode references deterministically, using
`Episode.id` as `remoteChapterId` and traversal order as the catalog position.

#### Scenario: Flat and grouped catalogs are parsed
- **WHEN** valid state contains ungrouped episodes or multiple chapter groups
- **THEN** every episode appears once with stable ID, title, deterministic position, canonical episode URL
  and access state

#### Scenario: Title or order changes without identity change
- **WHEN** a later valid snapshot contains the same episode IDs with changed titles or order
- **THEN** the catalog keeps the same identities and allows diff to emit rename or move events

#### Scenario: Malformed catalog fails closed
- **WHEN** state has duplicate/malformed episode IDs, dangling references, identity mismatch, missing root,
  or an unexpectedly empty catalog for a previously non-empty work
- **THEN** the adapter marks the snapshot incomplete or semantically invalid and does not return it as a
  complete empty catalog

### Requirement: Episode extraction is deterministic and versioned

The adapter MUST extract only the expected reader body, preserve readable ruby text and paragraph
boundaries, normalize with an explicit version, and hash normalized UTF-8 text with SHA-256.

#### Scenario: Synthetic episode fixture is normalized
- **WHEN** the body contains paragraphs, ruby markup, blank paragraphs and `<br>` elements
- **THEN** the adapter returns deterministic plain text, `normalizationVersion` and matching content hash

#### Scenario: Presentation-only markup changes
- **WHEN** two fixtures differ only in ignored presentation attributes or equivalent markup
- **THEN** they produce the same normalized text and content hash

#### Scenario: Reader body is missing or replaced by an access page
- **WHEN** the response is empty, login/block content, or lacks the expected body structure
- **THEN** the adapter returns the corresponding access state or `parser_broken`, never successful empty text

### Requirement: Catalog checks do not imply content edit detection

The adapter MUST NOT fetch episode bodies during metadata preview or catalog sync and MUST NOT infer that
episode content is unchanged solely from `publishedAt` or catalog metadata.

#### Scenario: Manual catalog check runs
- **WHEN** the user requests Check for updates on a Kakuyomu binding
- **THEN** the adapter fetches only work/catalog resources and performs zero episode-body requests

#### Scenario: User explicitly previews episode content
- **WHEN** the user requests content preview for a selected catalog item
- **THEN** the adapter may fetch that episode and a changed normalized hash can create `raw_changed` without
  automatically applying the revision

### Requirement: Missing episodes are non-destructive tombstones

The adapter and sync integration MUST treat absence as catalog evidence, not an instruction to delete local
data, and MUST rely on the foundation's complete-snapshot confirmation threshold.

#### Scenario: Episode is absent once
- **WHEN** one complete, semantically valid snapshot omits a known episode ID
- **THEN** its missing streak advances without deleting catalog, source text, target text or chapter data

#### Scenario: Snapshot is invalid or incomplete
- **WHEN** parsing, pagination or semantic validation fails
- **THEN** no missing streak advances and no removal event is produced

#### Scenario: Episode reappears
- **WHEN** the stable episode ID appears after one or more valid missing observations
- **THEN** the streak resets and a reappearance event can be produced without creating a new identity

### Requirement: Fixtures are offline and provenance-safe

Automated Kakuyomu tests MUST use minimal synthetic fixtures authored for the project and MUST NOT require
live network access or store complete third-party chapter text.

#### Scenario: Automated project checks run offline
- **WHEN** the normal test, lint, typecheck or build gate runs
- **THEN** all Kakuyomu tests use fixture transports and send no request to `kakuyomu.jp`

### Requirement: Availability is controlled by a release gate

The production registry MUST keep the Kakuyomu adapter unavailable until an access/terms review, versioned
live smoke result and explicit product-owner approval are recorded.

#### Scenario: Release evidence is incomplete
- **WHEN** parser tests pass but one release-gate item is absent or inconclusive
- **THEN** the UI does not advertise Kakuyomu as an available source and production network remains disabled
  for it

#### Scenario: Gate is approved
- **WHEN** all release evidence is recorded for the adapter version
- **THEN** the adapter may be enabled with initial health `unchecked`, not hard-coded `healthy`