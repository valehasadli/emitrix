# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-07-16

Initial public release of **Emitrix** — an async-first, type-safe in-process event bus for Node.js backends (DDD/EDA moduliths). Zero runtime dependencies; no Node-specific APIs, so it also runs in browsers, Deno, Bun, and React Native.

### Added

- **Typed event maps** — event names map to payload types; handlers receive `(payload, envelope)` and may be async. `emit` awaits every handler and returns a `Promise<EmitResult>`; async rejections are always captured and can never become unhandled promise rejections.
- **Event envelopes** — every event carries `id`, `timestamp`, `correlationId`, `causationId`, and mutable `metadata` for tracing, audit, and outbox integration.
- **Error policies** — `aggregate` (default: every handler runs, failures collected in `EmitResult.errors` and reported to `onError` hooks) or `fail-fast` (rejects with `EmitError`), configurable per emitter and per emit.
- **Dispatch modes** — `sequential` (default, priority-ordered) or `parallel`, configurable per emitter and per emit.
- **Wildcard subscriptions** — `'user.*'` prefix patterns and `'*'` catch-all, fully typed via template-literal types.
- **Middleware pipeline** — `use((event, next) => ...)` wraps every dispatch for tracing, logging, metrics, or enrichment; may short-circuit.
- **`waitFor(pattern, { timeoutMs, signal, filter })`** — promise-based one-shot subscription with `TimeoutError` / `AbortError` rejections.
- **`AbortSignal` support** on subscriptions; **delayed listeners** whose pending timers are cancelled by unsubscribe/abort.
- **Channels** — isolated scopes inheriting the parent configuration.
- **Introspection and memory management** — `listenerCount`, `eventNames`, `removeAllListeners`, `dispose()`, and leak warnings via an `onWarning` hook.

### Tooling

- TypeScript 7 (native compiler), ES2022 output, Jest 30, Babel 8; requires Node.js >= 20 (any modern browser works).
- Test suite (~95% coverage) plus a stress suite (`npm run test:stress`): memory soak with leak bounds, seeded fuzz against a reference model, and concurrency storms.
- CI: PR test matrix on Node 20/22/24/26, SonarCloud quality gate on every PR, and release-driven npm publishing via OIDC trusted publishing (no tokens).
