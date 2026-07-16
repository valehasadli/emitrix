# Emitrix

<p align="center">
  <strong>Async-first, type-safe in-process event bus for Node.js backends</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/emitrix" alt="npm version" />
  <img src="https://img.shields.io/npm/dm/emitrix" alt="npm downloads" />
  <img src="https://img.shields.io/badge/TypeScript-7.0-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="Zero dependencies" />
</p>

Emitrix is an in-process event bus built for backend architectures — domain events in a DDD modulith, module-to-module signaling, event-driven workflows. Handlers are **awaited**, failures follow an explicit **error policy**, every event carries **correlation metadata**, and a **middleware pipeline** gives you one place to hang tracing, logging, and metrics.

It has zero dependencies and uses no Node-specific APIs, so it also runs in browsers, Deno, Bun, and React Native.

## What Emitrix is — and is not

**It is** an in-process event bus: typed publish/subscribe between modules inside one process, with the semantics a backend needs (async handlers, error policies, causality metadata, observability hooks).

**It is not** a message broker. Events live in memory: they do not survive a crash, restart, or deploy, and they do not cross process boundaries. For durable or cross-service messaging, pair Emitrix with a transactional outbox and a broker (Kafka, NATS, Redis Streams). A common pattern: domain events dispatch in-process through Emitrix, and a middleware or `'*'` subscriber writes integration events to your outbox table.

## Installation

```
npm i emitrix
```

Requires Node.js >= 20 for backend use. Any modern browser works.

## Quick start

Event maps declare **payload types**. Handlers receive the payload plus a full event envelope, and `emit` awaits them all:

```typescript
import { Emitter } from 'emitrix';

type Events = {
  'user.registered': { userId: string; email: string };
  'user.verified': { userId: string };
  'match.created': { matchId: string; userIds: [string, string] };
};

const bus = new Emitter<Events>();

bus.on('user.registered', async ({ userId, email }, event) => {
  await mailer.sendWelcome(email);
  console.log(`welcome sent, correlationId=${event.correlationId}`);
});

const result = await bus.emit('user.registered', {
  userId: 'u1',
  email: 'u1@example.com',
});

result.ok;       // true when no handler failed
result.errors;   // handler failures (aggregate policy)
result.event.id; // unique event id
```

## Event envelopes

Every emit wraps the payload in an envelope carrying identity and causality — the metadata you need for tracing, audit logs, and outbox records:

```typescript
bus.on('match.created', (payload, event) => {
  event.id;            // unique id for this event
  event.name;          // 'match.created'
  event.timestamp;     // epoch ms
  event.correlationId; // defaults to event.id; propagate it across a flow
  event.causationId;   // id of the event/command that caused this one
  event.metadata;      // free-form, middleware may enrich it
});

await bus.emit('match.created', payload, {
  correlationId: incoming.correlationId, // carry the flow id forward
  causationId: incoming.id,              // record what caused this event
  metadata: { source: 'matching-service' },
});
```

## Error handling

Handler failures are never silently lost. Two policies, configurable per emitter and per emit:

```typescript
// 'aggregate' (default): every handler runs; failures are collected.
const bus = new Emitter<Events>({
  errorPolicy: 'aggregate',
  onError: (error, event, listener) => {
    logger.error({ error, event: event.name, listener: listener.pattern });
  },
});

const result = await bus.emit('user.registered', payload);
if (!result.ok) {
  // result.errors and per-listener result.outcomes tell you exactly what failed
}

// 'fail-fast': emit rejects with EmitError on the first failure.
await bus.emit('user.registered', payload, { errorPolicy: 'fail-fast' });
```

Async handler rejections are captured the same way as sync throws — they can never become unhandled promise rejections. `onError` hooks fire for every failure, including failures of delayed handlers.

## Dispatch modes

```typescript
// 'sequential' (default): one at a time, priority-ordered (higher first).
bus.on('user.registered', criticalHandler, { priority: 100 });
bus.on('user.registered', analyticsHandler, { priority: 0 });

// 'parallel': all handlers start concurrently.
await bus.emit('user.registered', payload, { dispatch: 'parallel' });
```

## Wildcard subscriptions

Prefix patterns (`'user.*'`) and a catch-all (`'*'`), fully typed — the payload type is the union of matching events:

```typescript
bus.on('user.*', (payload, event) => {
  // event.name: 'user.registered' | 'user.verified'
  audit.record(event.name, payload);
});

// The classic outbox/forwarding tap:
bus.on('*', (_payload, event) => outbox.enqueue(event));
```

## Middleware

Middleware wraps every dispatch. Use it for tracing spans, timing, logging, or enriching `event.metadata`. Not calling `next()` skips handlers entirely.

```typescript
bus.use(async (event, next) => {
  const span = tracer.startSpan(`event ${event.name}`, {
    attributes: { 'event.id': event.id, 'event.correlation_id': event.correlationId },
  });
  event.metadata.traceId = span.spanContext().traceId;
  try {
    await next();
  } finally {
    span.end();
  }
});
```

## Subscriptions

```typescript
// Unsubscribe function — also cancels pending delayed invocations.
const off = bus.on('user.registered', handler);
off();

// Fire at most once.
bus.once('user.registered', handler);

// Lifecycle-scoped via AbortSignal (aborting unsubscribes).
bus.on('user.registered', handler, { signal: controller.signal });

// Deferred invocation; cancelled by unsubscribe/abort.
bus.on('user.registered', handler, { delay: 5_000 });
```

Delayed handlers don't block `emit` — their outcome is reported as `'scheduled'` and any later failure goes to `onError` hooks.

## waitFor

Promise-based one-shot subscription — useful in sagas, tests, and startup coordination:

```typescript
import { TimeoutError, AbortError } from 'emitrix';

const payload = await bus.waitFor('user.verified', {
  timeoutMs: 30_000,                        // rejects with TimeoutError
  signal: controller.signal,                // rejects with AbortError
  filter: p => p.userId === expectedUserId, // only resolve on a match
});
```

## Channels

Isolated scopes sharing the parent's configuration but no listeners — useful for tenant, region, or test isolation:

```typescript
const eu = bus.channel('geo:eu');
eu.on('user.registered', euOnlyHandler);
await eu.emit('user.registered', payload); // root and other channels don't see this
```

## Introspection and memory management

```typescript
bus.listenerCount('user.registered'); // includes matching wildcard listeners
bus.eventNames();                     // exact names with listeners
bus.removeAllListeners('user.*');     // per pattern, or all with no argument
bus.dispose();                        // full teardown: listeners, middleware, hooks, channels

// Leak detection goes through a hook, not hardcoded console output:
const bus = new Emitter<Events>({
  maxListeners: 100, // 0 = unlimited
  onWarning: message => logger.warn(message),
});
```

## Using Emitrix in the browser

Backend-first does not mean backend-only. Emitrix uses no Node APIs — only `Promise`, `setTimeout`, and `AbortSignal` — so it works unchanged in React, Vue, Svelte, or vanilla JS. The same features carry over: `AbortSignal` subscriptions fit component lifecycles, `waitFor` fits async UI flows, and fire-and-forget is just calling `emit` without awaiting (pair it with an `onError` hook).

```typescript
useEffect(() => {
  const controller = new AbortController();
  bus.on('user.registered', handler, { signal: controller.signal });
  return () => controller.abort();
}, []);
```

## API summary

| Member | Description |
| --- | --- |
| `new Emitter<T>(options?)` | `errorPolicy`, `dispatch`, `maxListeners`, `onError`, `onWarning` |
| `on(pattern, handler, options?)` | Subscribe; options: `priority`, `signal`, `delay`. Returns unsubscribe |
| `once(pattern, handler, options?)` | Remove after first matching event |
| `emit(name, payload, options?)` | Await handlers; returns `Promise<EmitResult>`; options: `correlationId`, `causationId`, `metadata`, `errorPolicy`, `dispatch` |
| `waitFor(pattern, options?)` | Promise of next matching payload; `timeoutMs`, `signal`, `filter` |
| `use(middleware)` | Wrap dispatch; returns remover |
| `onError(hook)` | Handler-failure hook; returns remover |
| `channel(name)` | Isolated emitter with inherited config |
| `listenerCount(name)` / `eventNames()` | Introspection |
| `removeAllListeners(pattern?)` / `dispose()` | Cleanup |

Errors exported: `EmitError` (fail-fast), `TimeoutError` and `AbortError` (waitFor).

## Semantics worth knowing

- Handlers do not return values to the emitter — an event bus is one-way. Use `waitFor` or a dedicated query path for request/response.
- Wildcards are prefix-based: `'user.*'` matches `'user.registered'` and `'user.profile.updated'`. `'*'` matches everything. Priorities interleave exact and wildcard listeners.
- `once` listeners are detached before their handler runs, so re-entrant emits cannot fire them twice.
- Subscribe/unsubscribe are O(n) in the listener count per event — the right trade-off for a backend bus with tens of listeners per event, not tens of thousands.
- Migrating from 1.x: the API is not compatible. See [CHANGELOG](CHANGELOG.md) for the breaking-change list.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE) — free for any use, commercial or otherwise.
