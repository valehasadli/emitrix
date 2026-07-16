# Contributing to BlinkHub

Thanks for your interest in contributing! This document explains how to get set
up, what we expect from contributions, and how the release process works.

## Getting started

Requirements: Node.js >= 20 (CI runs on Node 22) and npm.

```bash
git clone https://github.com/valehasadli/BlinkHub.git
cd BlinkHub
npm install
npm test          # run the Jest suite
npm run build     # compile with TypeScript to dist/
```

Useful extras:

```bash
npm run test:coverage        # test with coverage report
npm run test:stress          # soak / fuzz / concurrency-storm suite (excluded from `npm test`)
node benchmarks/loadTest.js  # quick throughput sanity check (needs a build first)
```

The stress suite lives in `tests/stress/`: memory soak (leak bounds under
subscribe/unsubscribe churn), a seeded fuzzer that replays random operation
sequences against a reference model (failures are reproducible by seed), and
concurrency storms (parallel emits, error floods, mass timer cancellation).
If you touch dispatch, cancellation, or listener storage, run it.

## Project layout

```
src/lib/types.ts          # public type surface (event maps, envelopes, options)
src/lib/errors.ts         # EmitError, TimeoutError, AbortError
src/lib/ListenerStore.ts  # priority-ordered listener storage + wildcard matching
src/lib/Emitter.ts        # the event bus itself
tests/                    # Jest suite, mirrors the feature set
```

## Making changes

1. Fork the repo and create a branch from `master`.
2. Make your change. Keep the library **zero-dependency** and free of
   Node-specific APIs — everything must run in browsers, Deno, and Bun too.
3. Add or update tests. Every behavioral change needs a test that fails
   without it. Async semantics, cancellation, and error-policy behavior are
   the areas where regressions hurt the most.
4. Update the README if the public API changed, and add a line under
   `## [Unreleased]` in CHANGELOG.md.
5. Run `npm test` and `npm run build` — both must pass.
6. Open a pull request against `master` and fill in the PR template.

## Design principles

Please keep these in mind — PRs that fight them are unlikely to be merged:

- **Async-first.** `emit` awaits handlers; failures are never silently lost.
- **Explicit semantics.** Error policy, dispatch mode, and delivery behavior
  are documented contracts, not implementation details.
- **In-process only.** Durability, brokers, and cross-process transport are
  out of scope by design; BlinkHub composes with those systems instead of
  reimplementing them.
- **Small surface.** New API needs a strong, general use case.

## Reporting bugs and requesting features

Use the issue templates. For bugs, a minimal reproduction (a failing test is
ideal) speeds everything up. For security issues, **do not open a public
issue** — see [SECURITY.md](SECURITY.md).

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By
participating you agree to abide by it.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).
