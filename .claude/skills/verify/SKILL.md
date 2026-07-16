---
name: verify
description: End-to-end verification for emitrix changes — unit tests, stress suite, TS7 build, and a dist smoke test. Run before committing any non-trivial change.
---

# Verifying emitrix

Run all four; every one must pass:

1. `npm test` — unit suite
2. `npm run test:stress` — soak/fuzz/storm suite (mandatory for dispatch, cancellation, or ListenerStore changes; cheap enough to always run)
3. `npm run build` — TS7 compile to dist/
4. Dist smoke test (exercises the actual published artifact, not just src):

```bash
node -e "
const { Emitter } = require('./dist');
const bus = new Emitter();
bus.on('smoke.test', (p, e) => { if (!e.id || !e.correlationId) throw new Error('envelope broken'); });
bus.emit('smoke.test', { ok: true }).then(r => {
  if (!r.ok || r.outcomes.length !== 1) throw new Error('dispatch broken');
  console.log('dist smoke: OK');
});
"
```

If tests pass but the smoke test fails, the build output diverged from src expectations (tsconfig or export-shape issue) — check `dist/index.d.ts` exports before anything else.
