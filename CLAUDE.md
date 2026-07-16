# Emitrix — Project Guide

Async-first, type-safe **in-process event bus** for Node.js backends — domain events in DDD/EDA moduliths, module-to-module signaling. Zero runtime dependencies and no Node-specific APIs (only `Promise`, `setTimeout`, `AbortSignal`), so it also runs in browsers, Deno, Bun, and React Native.

It is deliberately NOT a message broker: events are in-memory only. Durability belongs to an outbox + broker (Kafka/NATS/Redis Streams) composed on top — never reimplement that here.

## Commands

- `npm test` — unit suite (tests/core, tests/channels); stress tests excluded
- `npm run test:stress` — soak / seeded-fuzz / concurrency-storm suite (tests/stress)
- `npm run test:coverage` — unit suite with coverage
- `npm run build` — TypeScript 7 → `dist/` (CommonJS, ES2022 target)
- `node benchmarks/loadTest.js` — throughput sanity check (requires a build)

## Architecture

- `src/lib/types.ts` — the public type surface: `EventMap` (event name → payload type), `EventEnvelope` (id, timestamp, correlationId, causationId, metadata), handler/options/result types, `Middleware`, `ErrorHook`
- `src/lib/errors.ts` — `EmitError` (fail-fast), `TimeoutError` / `AbortError` (waitFor)
- `src/lib/ListenerStore.ts` — priority-sorted listener buckets per exact event name plus prefix-wildcard entries (`'user.*'`, `'*'`); O(n) insert/remove by design (emit-heavy workload)
- `src/lib/Emitter.ts` — everything else: envelope creation, middleware chain, sequential/parallel dispatch, error policies (`aggregate` | `fail-fast`), `once`/`waitFor`, delayed listeners with timer cancellation, channels, leak warnings, `dispose()`

Handlers receive `(payload, envelope)` and may be async; `emit` awaits them all and returns an `EmitResult` (outcomes, errors, ok).

## Invariants — do not break these

1. **Zero runtime dependencies.** No exceptions, including "tiny" ones.
2. **No Node-only APIs.** The library must stay isomorphic.
3. **Async rejections never escape.** Every handler invocation is wrapped; a handler failure must land in an `EmitResult` and/or `onError` hook, never as an unhandled rejection.
4. **Unsubscribe cancels pending delayed timers.** The 1.x fire-after-unsubscribe bug must never return.
5. **`once` listeners detach before invocation** so re-entrant emits cannot double-fire them.
6. **Handlers do not return values to the emitter.** The bus is one-way; request/response goes through `waitFor` or a separate query path.

## Style

- Tabs for indentation; explicit return types on functions.
- Comments only for non-obvious constraints (see the createId fallback for the tone).
- Avoid `Math.random()` anywhere — SonarCloud S2245 fails the quality gate on it.

## Testing expectations

- Any behavioral change needs a test in `tests/core` or `tests/channels`.
- Changes to dispatch, cancellation, or `ListenerStore` must also pass `npm run test:stress` — the fuzz suite replays seeded random op sequences against a reference model and will catch listener-accounting regressions the unit tests miss.

## Release process

Merging to master does NOT release. Releases are explicit:

1. Bump `version` in package.json (`npm version patch|minor|major --no-git-tag-version`).
2. Add a `## [X.Y.Z] - YYYY-MM-DD` section to CHANGELOG.md — release notes are extracted from it verbatim.
3. Commit as `X.Y.Z`, push master.
4. Run `./scripts/release.sh` — tags `vX.Y.Z` and publishes a GitHub Release, which triggers CI: test → npm publish via **OIDC trusted publishing** (no tokens exist anywhere; never add one).

## CI map

- `test-on-pr.yml` — PRs to master: Node 20/22/24/26 matrix running unit + stress + build
- `sonarqube.yml` — master pushes and same-repo PRs: SonarCloud quality gate; PR conversations (including bot findings) must be resolved before merge
- `npm-publish.yml` — on GitHub Release published: test job, then OIDC publish (trusted publisher = this repo + this workflow filename; release tag must equal package.json version)
