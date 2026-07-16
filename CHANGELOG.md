# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.1] - 2026-07-16

### Changed
- No code changes. Validates the fully automated release pipeline: GitHub Release → CI tests → npm publish via OIDC trusted publishing. The 1.x-era package name has been unpublished from npm; `emitrix` is the sole identity.

## [2.0.0] - 2026-07-16

Complete rewrite as an async-first, in-process event bus for backend (DDD/EDA) use. **No backward compatibility with 1.x.**

**The package was renamed to `emitrix`** (repository: valehasadli/emitrix). 1.x releases remain published on npm under the previous name and are deprecated.

### Breaking
- **Event maps now declare payload types, not callback signatures** — `type Events = { 'user.registered': { userId: string } }`. Handlers receive `(payload, envelope)` instead of positional arguments.
- **`emit` is async** — it returns `Promise<EmitResult>` and awaits every handler (sync or async). Handler return values are no longer collected.
- **`subscribe`/`subscribeList`/`subscribeWithDelay` removed** — use `on(pattern, handler, options)` with `priority`, `delay`, and `signal` options.
- **Errors are no longer mixed into a results array** — under the default `aggregate` policy they are collected in `EmitResult.errors` and reported to `onError` hooks; under `fail-fast` emit rejects with `EmitError`.
- **Default export is now the named `Emitter` class**; the package exposes named exports for all types and errors.
- **Requires Node.js >= 20** (any modern browser still works).

### Added
- **Event envelopes** — every event carries `id`, `timestamp`, `correlationId`, `causationId`, and mutable `metadata` for tracing and outbox integration.
- **Error policies** — `aggregate` (default) or `fail-fast`, configurable per emitter and per emit.
- **Dispatch modes** — `sequential` (default, priority-ordered) or `parallel`, configurable per emitter and per emit.
- **Wildcard subscriptions** — `'user.*'` prefix patterns and `'*'` catch-all, fully typed via template-literal types.
- **Middleware pipeline** — `use((event, next) => ...)` wraps every dispatch for tracing, logging, metrics, or enrichment; may short-circuit.
- **`onError` hooks** — centralized handler-failure reporting, including failures of delayed handlers.
- **`waitFor(pattern, { timeoutMs, signal, filter })`** — promise-based one-shot subscription with `TimeoutError`/`AbortError` rejections.
- **`AbortSignal` support** on subscriptions.
- **Cancellable delayed listeners** — unsubscribe (or abort) now cancels pending `delay` timers (fixes 1.x firing after unsubscribe).
- **Leak warnings via `onWarning` hook** instead of hardcoded `console.warn`.
- **`dispose()`** for full teardown of listeners, middleware, hooks, and channels.

### Changed
- Tooling upgraded: TypeScript 7 (native compiler), Jest 30, Babel 8, ES2022 output (~4.5x faster emits than the 1.x ES2016 build).
- CI modernized: PR tests run on a Node 20/22/24/26 matrix; publish and Sonar jobs run on Node 24 LTS; actions upgraded (checkout/setup-node v7, action-gh-release v3); the deprecated sonarcloud-github-action replaced with SonarSource/sonarqube-scan-action v8.
- Added a stress suite (`npm run test:stress`, also in CI): memory-soak with leak bounds, seeded fuzz testing against a reference model, and concurrency storms (parallel emits, error floods, mass delayed-timer cancellation).
- **License changed from Apache-2.0 to MIT.**
- Added community health files: CODE_OF_CONDUCT.md (Contributor Covenant 2.1), CONTRIBUTING.md, issue templates, and a pull request template.

## [1.2.1] - 2026-02-03

### Changed
- **Dependencies** - Updated internal dependencies for improved security and performance

## [1.2.0] - 2025-10-31

### Documentation
- **Quick Start Examples** - Added complete minimal working apps for React, Vue, and Svelte
- **Framework Use Cases** - Added 11 production-ready examples across all frameworks
  - React: Toast notifications, real-time chat, analytics
  - Vue: Global state, shopping cart
  - Svelte: Loading state, form validation
  - Node.js: Event bus, monitoring, database streams, job queues
- **Integration Guides** - Added framework-specific best practices
  - React hooks and cleanup patterns
  - Vue composables and plugins
  - Svelte stores and lifecycle management
- **Enhanced FAQ** - Comprehensive answers with code examples
- **Comparison Tables** - Emitrix vs EventEmitter feature matrix
- **Professional Formatting** - Added badges, emojis, better structure

### Improved
- Better developer onboarding experience
- Clear framework-specific documentation
- Production-ready code examples

## [1.1.0] - 2025-10-31

### Added
- **Memory Management System** - Enterprise-grade memory leak detection and prevention
  - `setMaxListeners(n)` - Set maximum listeners per event (default: 10)
  - `getMaxListeners()` - Get current maximum listener limit
  - `listenerCount(event)` - Count listeners for specific events
  - `getEventNames()` - List all events with active listeners
  - `getListeners(event)` - Retrieve all listener functions for an event
  - `removeAllListeners(event?)` - Remove listeners for specific or all events
  - Automatic memory leak warnings when listener limit exceeded
  - Node.js EventEmitter API compatibility

### Changed
- Enhanced `PriorityQueue` with `size()` method for listener tracking
- Improved event registry with listener introspection capabilities

### Documentation
- Added comprehensive Memory Management section to README
- Added best practices for listener cleanup
- Added memory leak detection examples

## [1.0.4] - 2025-10-27

### Internal
- Upgraded to modern GitHub release action for better automation

### Added
- Automated GitHub releases workflow triggered by version tags
- Helper script `scripts/release.sh` for simplified release process
- npm provenance support for supply chain security

## [1.0.3] - 2025-10-27

### Added
- Automated GitHub releases workflow triggered by version tags
- Helper script `scripts/release.sh` for simplified release process
- npm provenance support for supply chain security

### Changed
- npm publish workflow now triggers on git tags (v*) instead of master branch pushes
- GitHub releases are now auto-created with changelog content extracted from CHANGELOG.md
- Improved release workflow with automated testing, building, and publishing

## [1.0.2] - 2025-10-27

### Fixed
- Fixed README.md not appearing on npm package page
- Removed README.md from .npmignore
- Added README.md, CHANGELOG.md, and LICENSE to package.json files array
- Removed unnecessary GitHub Actions workflows (greetings, labeler, stale)

## [1.0.1] - 2025-10-27

### Security
- Updated dev dependencies to resolve security vulnerabilities
- Fixed 5 vulnerabilities (1 high, 3 moderate, 1 low) in dev dependencies
  - @babel/helpers (<7.26.10)
  - @babel/runtime (<7.26.10)
  - brace-expansion (1.0.0 - 1.1.11)
  - cross-spawn (7.0.0 - 7.0.4)
  - micromatch (<4.0.8)

### Changed
- All tests continue to pass (55/55 tests, 100% coverage)
- Build process verified and working

## [1.0.0] - 2025-10-27

### Changed
- **BREAKING**: Changed license from GPL-3.0-or-later to Apache-2.0 for enterprise compatibility
- Migrated from yarn to npm for package management
- Updated GitHub Actions workflows to use npm instead of yarn
- Upgraded GitHub Actions to v4 (setup-node@v4, checkout@v4)
- Disabled SonarCloud scans on pull requests (only runs on master branch)

### Removed
- Removed yarn.lock file
- Removed all yarn-related references from configuration files

### Fixed
- Fixed GitHub Actions cache errors by switching from yarn to npm cache
- Fixed YAML syntax errors in npm-publish workflow

## [0.5.0.1] - Previous Development Version

### Added
- Type-safe event emitter with TypeScript support
- Priority-based event handling
- Channel-based event handling for isolated event scopes
- `once()` method for single-execution listeners
- `subscribeWithDelay()` for delayed event handling
- `subscribeList()` for bulk event subscriptions
- Comprehensive error handling and resilience
- 100% test coverage (55 tests)
- Zero runtime dependencies

### Features
- Full TypeScript support with strict typing
- Event subscription with priority queues
- Multiple event channels for modular architecture
- Automatic unsubscribe functionality
- Support for async callbacks
- Detailed documentation and examples

[unreleased]: https://github.com/valehasadli/emitrix/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/valehasadli/emitrix/compare/v1.1.0...v1.2.0
[1.0.3]: https://github.com/valehasadli/emitrix/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/valehasadli/emitrix/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/valehasadli/emitrix/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/valehasadli/emitrix/compare/v0.5.0.1...v1.0.0
[0.5.0.1]: https://github.com/valehasadli/emitrix/releases/tag/v0.5.0.1
