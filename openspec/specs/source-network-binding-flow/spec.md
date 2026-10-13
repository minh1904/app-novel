# source-network-binding-flow Specification

## Purpose
Định nghĩa contract và luồng người dùng biến URL nguồn mạng thành preview rồi binding mà không ghi dữ liệu
trước xác nhận, đồng thời giữ đồng bộ thủ công và không tự tải/dịch.

## Requirements

### Requirement: URL identification returns binding identity

The source binding API MUST call adapter identification and return a typed result containing source
descriptor, remote work ID, adapter-owned canonical URL and optional input chapter ID.

#### Scenario: Supported work URL is identified without network access
- **WHEN** the user submits a syntactically supported work URL
- **THEN** identify returns the typed identity and performs no remote request or database write

#### Scenario: Supported episode URL identifies its parent work
- **WHEN** the user submits a supported episode URL
- **THEN** identify returns work-level binding identity and retains the episode ID only as preview context

#### Scenario: Unsupported URL is submitted
- **WHEN** no enabled adapter identifies the candidate
- **THEN** the API returns no match and does not guess from hostname alone

#### Scenario: Adapter exists but release gate is closed
- **WHEN** a candidate matches an adapter that is not released
- **THEN** the UI reports that the source is not currently available and cannot proceed to network preview

### Requirement: Preview is typed, bounded and side-effect free

Preview creation MUST fetch metadata and a complete validated catalog through the scoped broker and return
a typed, expiring preview without modifying work data.

#### Scenario: Preview succeeds
- **WHEN** an identified source returns valid metadata and catalog within broker budgets
- **THEN** preview returns ID, expiry, canonical identity, title, language, item/match/warning counts and a
  bounded catalog sample

#### Scenario: Preview fails or is cancelled
- **WHEN** network, parser, budget or cancellation failure occurs
- **THEN** no binding, catalog item, chapter, content revision or translation job is written

#### Scenario: Preview would require episode content
- **WHEN** catalog metadata is sufficient to create the binding preview
- **THEN** preview performs zero episode-body requests

### Requirement: Confirmation is bound to one fresh preview

Binding creation MUST require a single-use `expectedPreviewId` bound to work, source, remote work, canonical
URL and auth profile, and MUST atomically persist the binding and previewed catalog.

#### Scenario: Matching preview is confirmed
- **WHEN** the user confirms with the exact unexpired, unused preview identity
- **THEN** the service transactionally creates one binding and its catalog snapshot using adapter-owned
  canonical identity

#### Scenario: Preview is stale, replayed or mismatched
- **WHEN** the preview expired, was already consumed, or any bound identity differs
- **THEN** creation is rejected and no partial binding/catalog data remains

### Requirement: The URL wizard exposes the full confirmation flow

The Add Raw Version wizard MUST support URL as a distinct source kind and expose identify, preview,
warnings, role/label selection, confirmation, cancellation and retry states.

#### Scenario: User adds a network raw version
- **WHEN** an enabled adapter identifies and previews the pasted URL
- **THEN** the user sees source/work metadata and catalog summary before choosing to confirm

#### Scenario: Parser or network is inconclusive
- **WHEN** preview cannot distinguish site drift, blocking or transient unavailability
- **THEN** the wizard preserves the input, explains the safe state and offers retry/cancel without an
  entitlement-bypass action

### Requirement: Network sync remains explicit and catalog-only

The system MUST start a network source sync only from an explicit user action while the app is open and
MUST restrict that sync to metadata/catalog discovery.

#### Scenario: User checks for updates
- **WHEN** the user activates Check for updates for a network binding
- **THEN** one cancellable manual sync runs and may create catalog update events

#### Scenario: App starts or remains idle
- **WHEN** no user requests a check
- **THEN** no timer, startup hook or background process starts network sync

#### Scenario: New or changed catalog evidence is found
- **WHEN** sync detects added, renamed, moved, access-changed, missing or reappeared items
- **THEN** it creates non-destructive events without fetching raw bodies, creating chapters, changing local
  source/target text or enqueueing translation

### Requirement: Network operations stay behind trusted IPC and the scoped broker

Renderer and adapter code MUST NOT receive general network primitives, credentials, database handles or a
generic invoke-arbitrary-adapter endpoint.

#### Scenario: Renderer requests identify, preview or sync
- **WHEN** a trusted sender invokes a declared source IPC method
- **THEN** main validates the typed payload and executes only the corresponding service operation

#### Scenario: Sender or operation is not authorized
- **WHEN** an untrusted sender or adapter requests an undeclared capability
- **THEN** main rejects it before network or database side effects
