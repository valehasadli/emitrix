---
name: bench
description: Run emitrix performance checks — throughput benchmark and stress suite — and judge regressions against recorded baselines. Use for performance questions and before merging changes to dispatch, ListenerStore, or the middleware chain.
---

# Benchmarking emitrix

1. `npm run build` (benchmark runs against `dist/`)
2. `node benchmarks/loadTest.js` — 1M awaited emits across 4 listeners (incl. one wildcard)
3. `npm run test:stress` — memory soak with leak bounds, seeded fuzz, concurrency storms

## Baselines (2026-07, Apple-silicon dev machine, Node 22)

- Benchmark loop: ~700 ms for 1M awaited emits
- ~600 ns/emit with envelope + middleware + 4 mixed listeners (~1.6M emits/s/core)
- Plain emit, 4 exact listeners: ~570 ns; parallel dispatch, 8 async listeners: ~840 ns
- Subscribe+unsubscribe churn: ~300 ns with 100 standing listeners, ~1.3 µs at 1k, ~11.7 µs at 10k — linear O(n) growth is expected and accepted (emit-heavy workload trade-off)
- 10k concurrent `waitFor` resolved by one emit: ~75 ms total

## Interpreting regressions

- >2x slower on the benchmark loop: look at `ListenerStore.collect` (the wildcard path concat+sort) and the middleware `reduceRight` chain first.
- Soak-test heap growth over its 10 MB bound: something is retaining per-subscription state — check timer sets and `detachSignal` cleanup.
- Fuzz failures print their seed — rerun is deterministic; do not shrug them off as flakes, they never are.
