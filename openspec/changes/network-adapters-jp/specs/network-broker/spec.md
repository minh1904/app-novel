## Purpose

Định nghĩa transport mạng giới hạn quyền cho source adapter, bảo đảm địa chỉ thực sự nhận kết nối đã được
phê duyệt và mọi request bị giới hạn về đích, thời gian, dung lượng, nhịp độ và retry.

## ADDED Requirements

### Requirement: Production requests use an exact HTTPS origin policy

The network broker MUST accept production requests only when the URL uses HTTPS, contains no credentials,
and its normalized origin exactly matches an origin in the requesting adapter's validated policy.

#### Scenario: Allowed HTTPS origin proceeds to resolution
- **WHEN** an adapter requests `https://kakuyomu.jp/works/1` and its policy contains
  `https://kakuyomu.jp`
- **THEN** the broker proceeds to address resolution without weakening the match to a hostname suffix

#### Scenario: HTTP is rejected in production
- **WHEN** an adapter requests an HTTP URL in a production broker
- **THEN** the broker returns `origin_not_allowed` before sending a network packet

#### Scenario: Lookalike origin is rejected
- **WHEN** an adapter requests a subdomain, non-default port, URL with credentials, or suffix-lookalike not
  present as the same normalized origin
- **THEN** the broker returns `origin_not_allowed` before sending a network packet

#### Scenario: Fixture transport may use HTTP only in tests
- **WHEN** a test constructs the explicitly test-only fixture transport with an HTTP origin
- **THEN** the request can exercise broker behavior without making HTTP valid in production policy

### Requirement: Every connected address is public and connection-bound

The broker MUST resolve all A and AAAA answers, reject the request if any answer is non-public or
special-use, bind the approved answer set to the socket lookup, preserve the original hostname for TLS
verification, and verify that the connected peer belongs to the approved set.

#### Scenario: Private and special-use literals are blocked
- **WHEN** a URL contains an IPv4, IPv6, IPv4-mapped IPv6, or alternate IP representation belonging to
  loopback, private, link-local, multicast, unspecified, documentation, reserved, carrier-grade NAT, or
  another non-public range
- **THEN** the broker returns `address_blocked` without opening a connection

#### Scenario: Mixed DNS answer set is blocked
- **WHEN** DNS returns at least one public address and at least one non-public address for the same host
- **THEN** the broker returns `address_blocked` and uses none of the answers

#### Scenario: DNS rebinding cannot change the connection target
- **WHEN** the system resolver would return a different address after broker validation
- **THEN** the connection uses only the broker-approved pinned answers and rejects any different peer

#### Scenario: TLS still validates the declared hostname
- **WHEN** the broker connects through a pinned IP for an HTTPS origin
- **THEN** SNI and certificate verification use the original URL hostname rather than the IP literal

### Requirement: Redirects are manual and independently authorized

The broker MUST disable automatic redirects and validate protocol, exact origin, DNS answers, connected
peer, redirect count and sensitive headers for every redirect hop.

#### Scenario: Allowed relative redirect succeeds
- **WHEN** a response redirects to a relative HTTPS URL whose resolved origin remains allowed and public
- **THEN** the broker validates and dispatches the next hop within the same operation budget

#### Scenario: Redirect to undeclared or private destination is blocked
- **WHEN** any redirect resolves to an undeclared origin or a non-public address
- **THEN** the broker returns `redirect_not_allowed` or `address_blocked` without contacting that target

#### Scenario: Redirect count is bounded
- **WHEN** a redirect chain exceeds the lower of broker hard limit 5 and the adapter policy limit
- **THEN** the broker terminates the operation with `redirect_limit_exceeded`

#### Scenario: Cross-origin redirect strips credentials
- **WHEN** an allowed redirect changes origin
- **THEN** the broker does not forward authorization, cookie, proxy authorization, or opaque auth material
  to the new origin

### Requirement: Adapters cannot control connection-sensitive headers

The broker MUST reject adapter attempts to set host, connection, proxy, forwarding, transfer framing, or
other connection-sensitive headers reserved to the broker.

#### Scenario: Adapter supplies a forbidden header
- **WHEN** an adapter request supplies `Host`, `Connection`, `Proxy-Authorization`, `Forwarded`,
  `X-Forwarded-For`, `Content-Length`, or `Transfer-Encoding`
- **THEN** the broker rejects the request before dispatch and does not include the value in logs

### Requirement: Deadlines and resource budgets cover the whole operation

The broker MUST enforce one operation deadline across queueing, DNS, connect, redirects, retry delays,
headers and body reads, plus validated limits for requests, attempts and decoded response bytes.

#### Scenario: Deadline expires in any phase
- **WHEN** the operation deadline expires while queued, resolving, connecting, backing off, waiting for
  headers or reading the body
- **THEN** the broker aborts outstanding work, closes resources and returns `deadline_exceeded`

#### Scenario: Decoded body exceeds the limit
- **WHEN** decompressed response bytes exceed `maxResponseBytes`, regardless of `Content-Length` or transfer
  encoding
- **THEN** the broker stops reading, closes the response and returns `response_too_large`

#### Scenario: Operation exhausts request budget
- **WHEN** initial requests, redirects and retries would exceed `operationRequestBudget`
- **THEN** the broker returns `request_budget_exceeded` before dispatching the excess request

#### Scenario: User cancels in any phase
- **WHEN** the caller aborts while the operation is queued, resolving, connecting, backing off or streaming
- **THEN** the broker promptly stops that operation and releases its queue slot, timer, stream and socket

### Requirement: Concurrency and pacing are enforced independently

The broker MUST enforce validated global and per-origin concurrency and MUST keep dispatch start times for
the same origin at least `minIntervalMs` apart, including retries.

#### Scenario: Same-origin requests are paced
- **WHEN** several Kakuyomu requests are queued with concurrency 1 and `minIntervalMs` 1000
- **THEN** they start sequentially with at least 1000 ms between starts

#### Scenario: Independent origin can progress
- **WHEN** one origin is waiting for its pacing window and capacity exists for another origin
- **THEN** the other origin can start without head-of-line blocking

### Requirement: Retry is finite, idempotent and deadline-bound

The broker MUST retry only bodyless GET requests after a network failure before response or status
`429`, `502`, `503`, or `504`, up to `maxAttempts` and within the operation deadline.

#### Scenario: Retry-After is honored
- **WHEN** an eligible response contains a valid `Retry-After` that fits the remaining deadline
- **THEN** the next attempt starts no earlier than that delay and still obeys origin pacing

#### Scenario: Transient failure has no Retry-After
- **WHEN** an eligible failure has no valid `Retry-After`
- **THEN** the broker applies bounded exponential backoff with jitter before the next allowed attempt

#### Scenario: Non-idempotent or permanent failure is not retried
- **WHEN** a POST, a GET with body, a non-eligible 4xx response, or a parser error occurs
- **THEN** the broker returns the result without a retry

### Requirement: Diagnostics are useful without exposing secrets

The broker MUST emit structured diagnostics containing source ID, origin, phase, attempt and safe error
code while excluding URL credentials, sensitive query values, request/response bodies, cookies,
authorization headers and auth handles.

#### Scenario: Network operation fails with credentials present
- **WHEN** a request or response fails after auth material has been resolved
- **THEN** logs and user-visible errors identify the safe phase/code but contain none of that material