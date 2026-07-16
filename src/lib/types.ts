/**
 * An event map declares event names and their payload types:
 *
 * type Events = {
 *   'user.registered': { userId: string };
 *   'match.created': { matchId: string; userIds: [string, string] };
 * };
 */
export type EventMap = Record<string, unknown>;

export type EventKey<T extends EventMap> = Extract<keyof T, string>;

/**
 * What you can subscribe to: an exact event name, a prefix wildcard
 * ('user.*' matches 'user.registered', 'user.profile.updated', ...),
 * or '*' for every event.
 */
export type EventPattern<T extends EventMap> = EventKey<T> | '*' | `${string}.*`;

/** Resolves a subscription pattern to the union of event keys it matches. */
export type MatchingKeys<T extends EventMap, P extends string> = P extends '*'
	? EventKey<T>
	: P extends `${infer Prefix}.*`
		? Extract<EventKey<T>, `${Prefix}.${string}`>
		: Extract<P, EventKey<T>>;

/**
 * Every emitted event travels inside an envelope carrying identity and
 * causality metadata — the shape a DDD/EDA backend needs for tracing,
 * logging, and building an outbox record.
 */
export interface EventEnvelope<T extends EventMap, K extends EventKey<T> = EventKey<T>> {
	readonly id: string;
	readonly name: K;
	readonly payload: T[K];
	/** Unix epoch milliseconds at emit time. */
	readonly timestamp: number;
	/** Defaults to the event's own id when not provided at emit. */
	readonly correlationId: string;
	/** The id of the event (or command) that caused this one, if any. */
	readonly causationId?: string;
	/** Free-form metadata; middleware may read and mutate this. */
	readonly metadata: Record<string, unknown>;
}

/**
 * Handlers receive the payload plus the full envelope and may be async.
 * `emit` awaits them. Handlers do not return values — an event bus is
 * one-way; use `waitFor` or a dedicated query path for request/response.
 */
export type EventHandler<T extends EventMap, K extends EventKey<T> = EventKey<T>> = (
	payload: T[K],
	event: EventEnvelope<T, K>,
) => void | Promise<void>;

export type Unsubscribe = () => void;

/**
 * 'aggregate' (default): every handler runs; failures are collected into
 * the EmitResult and reported to onError hooks. 'fail-fast': emit rejects
 * with EmitError on the first handler failure.
 */
export type ErrorPolicy = 'aggregate' | 'fail-fast';

/**
 * 'sequential' (default): handlers run one at a time in priority order.
 * 'parallel': handlers start concurrently; priority does not order them.
 */
export type DispatchMode = 'sequential' | 'parallel';

export interface SubscribeOptions {
	/** Higher priority runs earlier (sequential dispatch only). Default 0. */
	priority?: number;
	/** Aborting the signal unsubscribes and cancels any pending delayed runs. */
	signal?: AbortSignal;
	/**
	 * Defer each invocation by this many milliseconds. Delayed invocations
	 * are cancelled by unsubscribing. Their outcome in EmitResult is
	 * 'scheduled'; failures are reported to onError hooks only.
	 */
	delay?: number;
}

export interface EmitOptions {
	correlationId?: string;
	causationId?: string;
	metadata?: Record<string, unknown>;
	/** Override the emitter-level error policy for this emit. */
	errorPolicy?: ErrorPolicy;
	/** Override the emitter-level dispatch mode for this emit. */
	dispatch?: DispatchMode;
}

export type ListenerStatus = 'ok' | 'error' | 'scheduled';

export interface ListenerOutcome {
	status: ListenerStatus;
	/** The pattern the listener was registered under. */
	pattern: string;
	priority: number;
	error?: unknown;
}

export interface EmitResult<T extends EventMap, K extends EventKey<T> = EventKey<T>> {
	event: EventEnvelope<T, K>;
	outcomes: ListenerOutcome[];
	errors: unknown[];
	/** True when no handler failed (scheduled handlers are not counted). */
	ok: boolean;
}

/**
 * Middleware wraps dispatch: it runs on every emit, may mutate
 * `event.metadata`, and may skip handlers entirely by not calling `next`.
 * Use it for tracing spans, logging, metrics, or event enrichment.
 */
export type Middleware<T extends EventMap> = (
	event: EventEnvelope<T>,
	next: () => Promise<void>,
) => void | Promise<void>;

export type ErrorHook<T extends EventMap> = (
	error: unknown,
	event: EventEnvelope<T>,
	listener: { pattern: string; priority: number },
) => void;

export interface EmitterOptions<T extends EventMap> {
	errorPolicy?: ErrorPolicy;
	dispatch?: DispatchMode;
	/** Per-pattern listener count that triggers onWarning. 0 = unlimited. Default 100. */
	maxListeners?: number;
	onError?: ErrorHook<T>;
	/** Receives leak warnings. Defaults to console.warn. */
	onWarning?: (message: string) => void;
}

export interface WaitForOptions<T extends EventMap, K extends EventKey<T> = EventKey<T>> {
	/** Reject with TimeoutError after this many milliseconds. */
	timeoutMs?: number;
	/** Reject with AbortError when the signal aborts. */
	signal?: AbortSignal;
	/** Only resolve for events the predicate accepts. */
	filter?: (payload: T[K], event: EventEnvelope<T, K>) => boolean;
}
