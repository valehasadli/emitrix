import {
	DispatchMode,
	EmitOptions,
	EmitResult,
	EmitterOptions,
	ErrorHook,
	ErrorPolicy,
	EventEnvelope,
	EventHandler,
	EventKey,
	EventMap,
	EventPattern,
	ListenerOutcome,
	MatchingKeys,
	Middleware,
	SubscribeOptions,
	Unsubscribe,
	WaitForOptions,
} from './types';
import { AbortError, EmitError, TimeoutError } from './errors';
import { InternalHandler, ListenerEntry, ListenerStore, parsePrefix } from './ListenerStore';

let idCounter = 0;

const createId = (): string => {
	const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
	if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
		return cryptoApi.randomUUID();
	}
	// Fallback for runtimes without Web Crypto. Event ids are identifiers,
	// not security tokens: the monotonic counter guarantees uniqueness
	// within the process, which is all the envelope contract requires.
	idCounter += 1;
	return `evt_${Date.now().toString(36)}_${idCounter.toString(36)}`;
};

interface ResolvedOptions<T extends EventMap> {
	errorPolicy: ErrorPolicy;
	dispatch: DispatchMode;
	maxListeners: number;
	onWarning: (message: string) => void;
	onError?: ErrorHook<T>;
}

export class Emitter<T extends EventMap> {
	private store = new ListenerStore();
	private middlewares: Middleware<T>[] = [];
	private errorHooks = new Set<ErrorHook<T>>();
	private channels = new Map<string, Emitter<T>>();
	private warned = new Set<string>();
	private seq = 0;
	private readonly options: ResolvedOptions<T>;
	private readonly rawOptions: EmitterOptions<T>;

	constructor(options: EmitterOptions<T> = {}) {
		this.rawOptions = options;
		this.options = {
			errorPolicy: options.errorPolicy ?? 'aggregate',
			dispatch: options.dispatch ?? 'sequential',
			maxListeners: options.maxListeners ?? 100,
			onWarning: options.onWarning ?? ((message: string): void => console.warn(message)),
			onError: options.onError,
		};
		if (this.options.maxListeners < 0) {
			throw new RangeError('maxListeners must be a non-negative number');
		}
		if (options.onError) {
			this.errorHooks.add(options.onError);
		}
	}

	/**
	 * Subscribe to an exact event name, a prefix wildcard ('user.*'),
	 * or all events ('*'). Returns an unsubscribe function that also
	 * cancels any pending delayed invocations.
	 */
	on<P extends EventPattern<T>>(
		pattern: P,
		handler: EventHandler<T, MatchingKeys<T, P>>,
		options: SubscribeOptions = {},
	): Unsubscribe {
		return this.register(pattern, handler as InternalHandler, options, false);
	}

	/** Like `on`, but the listener is removed after its first matching event. */
	once<P extends EventPattern<T>>(
		pattern: P,
		handler: EventHandler<T, MatchingKeys<T, P>>,
		options: SubscribeOptions = {},
	): Unsubscribe {
		return this.register(pattern, handler as InternalHandler, options, true);
	}

	/**
	 * Resolve with the payload of the next matching event.
	 * Rejects with TimeoutError / AbortError.
	 */
	waitFor<P extends EventPattern<T>>(
		pattern: P,
		options: WaitForOptions<T, MatchingKeys<T, P>> = {},
	): Promise<T[MatchingKeys<T, P>]> {
		const { timeoutMs, signal, filter } = options;
		return new Promise((resolve, reject) => {
			if (signal?.aborted) {
				reject(new AbortError(pattern));
				return;
			}
			let timer: ReturnType<typeof setTimeout> | undefined;
			let unsubscribe: Unsubscribe = () => undefined;
			const cleanup = (): void => {
				if (timer !== undefined) {
					clearTimeout(timer);
				}
				signal?.removeEventListener('abort', onAbort);
				unsubscribe();
			};
			const onAbort = (): void => {
				cleanup();
				reject(new AbortError(pattern));
			};
			unsubscribe = this.on(
				pattern,
				((payload, event) => {
					if (filter && !filter(payload, event)) {
						return;
					}
					cleanup();
					resolve(payload);
				}) as EventHandler<T, MatchingKeys<T, P>>,
			);
			if (timeoutMs !== undefined) {
				timer = setTimeout(() => {
					cleanup();
					reject(new TimeoutError(pattern, timeoutMs));
				}, timeoutMs);
			}
			signal?.addEventListener('abort', onAbort, { once: true });
		});
	}

	/**
	 * Emit an event and await its handlers.
	 *
	 * 'aggregate' policy (default): resolves with an EmitResult collecting
	 * every handler outcome. 'fail-fast': rejects with EmitError on the
	 * first handler failure.
	 */
	async emit<K extends EventKey<T>>(
		name: K,
		payload: T[K],
		options: EmitOptions = {},
	): Promise<EmitResult<T, K>> {
		const id = createId();
		const event: EventEnvelope<T, K> = {
			id,
			name,
			payload,
			timestamp: Date.now(),
			correlationId: options.correlationId ?? id,
			causationId: options.causationId,
			metadata: { ...(options.metadata ?? {}) },
		};
		const errorPolicy = options.errorPolicy ?? this.options.errorPolicy;
		const dispatch = options.dispatch ?? this.options.dispatch;

		const outcomes: ListenerOutcome[] = [];
		const errors: unknown[] = [];

		const invoke = async (entry: ListenerEntry): Promise<void> => {
			if (entry.removed) {
				return;
			}
			if (entry.delay !== undefined) {
				this.schedule(entry, payload, event);
				outcomes.push({ status: 'scheduled', pattern: entry.pattern, priority: entry.priority });
				return;
			}
			try {
				await entry.handler(payload, event);
				outcomes.push({ status: 'ok', pattern: entry.pattern, priority: entry.priority });
			} catch (error) {
				outcomes.push({ status: 'error', pattern: entry.pattern, priority: entry.priority, error });
				errors.push(error);
				this.notifyError(error, event, entry);
				if (errorPolicy === 'fail-fast') {
					throw new EmitError(name, event.id, error);
				}
			}
		};

		const runHandlers = async (): Promise<void> => {
			const entries = this.store.collect(name);
			// Detach once-listeners before invoking so re-entrant emits
			// cannot fire them twice. Their unsubscribe closures stay valid
			// for cancelling pending delayed invocations.
			for (const entry of entries) {
				if (entry.once) {
					this.store.remove(entry);
				}
			}
			if (dispatch === 'parallel') {
				await Promise.all(entries.map(invoke));
			} else {
				for (const entry of entries) {
					await invoke(entry);
				}
			}
		};

		const chain = this.middlewares.reduceRight<() => Promise<void>>(
			(next, middleware) => (): Promise<void> =>
				Promise.resolve(middleware(event as EventEnvelope<T>, next)),
			runHandlers,
		);
		await chain();

		return { event, outcomes, errors, ok: errors.length === 0 };
	}

	/**
	 * Register middleware wrapping every emit. Runs in registration order;
	 * a middleware that does not call next() skips all handlers.
	 * Returns a function that removes the middleware.
	 */
	use(middleware: Middleware<T>): Unsubscribe {
		this.middlewares.push(middleware);
		return (): void => {
			const index = this.middlewares.indexOf(middleware);
			if (index !== -1) {
				this.middlewares.splice(index, 1);
			}
		};
	}

	/**
	 * Register a hook invoked for every handler failure (including
	 * failures of delayed handlers, which never appear in an EmitResult).
	 * Returns a function that removes the hook.
	 */
	onError(hook: ErrorHook<T>): Unsubscribe {
		this.errorHooks.add(hook);
		return (): void => {
			this.errorHooks.delete(hook);
		};
	}

	/**
	 * An isolated Emitter sharing this emitter's configuration but no
	 * listeners, middleware, or error hooks. Same name → same instance.
	 */
	channel(name: string): Emitter<T> {
		let child = this.channels.get(name);
		if (!child) {
			child = new Emitter<T>(this.rawOptions);
			this.channels.set(name, child);
		}
		return child;
	}

	/** Number of listeners that would fire for this event name. */
	listenerCount(name: EventKey<T>): number {
		return this.store.countFor(name);
	}

	/** Exact event names with at least one listener (patterns not included). */
	eventNames(): EventKey<T>[] {
		return this.store.eventNames() as EventKey<T>[];
	}

	/**
	 * Remove listeners registered under one pattern string, or all of them.
	 * Pending delayed invocations of removed listeners are cancelled.
	 */
	removeAllListeners(pattern?: EventPattern<T>): this {
		const taken = this.store.take(pattern);
		for (const entry of taken) {
			this.disposeEntry(entry);
		}
		if (pattern === undefined) {
			this.warned.clear();
		} else {
			this.warned.delete(pattern);
		}
		return this;
	}

	/** Remove all listeners, middleware, error hooks, and channels. */
	dispose(): void {
		this.removeAllListeners();
		this.middlewares = [];
		this.errorHooks.clear();
		for (const child of this.channels.values()) {
			child.dispose();
		}
		this.channels.clear();
	}

	private register(
		pattern: string,
		handler: InternalHandler,
		options: SubscribeOptions,
		once: boolean,
	): Unsubscribe {
		if (options.delay !== undefined && (!Number.isFinite(options.delay) || options.delay < 0)) {
			throw new RangeError('delay must be a non-negative number of milliseconds');
		}
		if (options.signal?.aborted) {
			return (): void => undefined;
		}
		this.seq += 1;
		const entry: ListenerEntry = {
			seq: this.seq,
			pattern,
			prefix: parsePrefix(pattern),
			handler,
			priority: options.priority ?? 0,
			delay: options.delay,
			once,
			removed: false,
			pendingTimers: new Set(),
		};
		this.store.add(entry);
		this.checkMaxListeners(pattern);

		const unsubscribe = (): void => {
			if (entry.removed) {
				return;
			}
			this.store.remove(entry);
			this.disposeEntry(entry);
		};
		const signal = options.signal;
		if (signal) {
			const onAbort = (): void => unsubscribe();
			signal.addEventListener('abort', onAbort, { once: true });
			entry.detachSignal = (): void => signal.removeEventListener('abort', onAbort);
		}
		return unsubscribe;
	}

	private disposeEntry(entry: ListenerEntry): void {
		entry.removed = true;
		for (const timer of entry.pendingTimers) {
			clearTimeout(timer);
		}
		entry.pendingTimers.clear();
		entry.detachSignal?.();
	}

	private schedule(entry: ListenerEntry, payload: unknown, event: EventEnvelope<T>): void {
		const timer = setTimeout(() => {
			entry.pendingTimers.delete(timer);
			if (entry.once) {
				this.disposeEntry(entry);
			}
			Promise.resolve()
				.then(() => entry.handler(payload, event))
				.catch(error => this.notifyError(error, event, entry));
		}, entry.delay);
		entry.pendingTimers.add(timer);
	}

	private notifyError(error: unknown, event: EventEnvelope<T, EventKey<T>>, entry: ListenerEntry): void {
		for (const hook of this.errorHooks) {
			try {
				hook(error, event as EventEnvelope<T>, { pattern: entry.pattern, priority: entry.priority });
			} catch {
				// An error hook must never take down dispatch.
			}
		}
	}

	private checkMaxListeners(pattern: string): void {
		const max = this.options.maxListeners;
		if (max === 0) {
			return;
		}
		const count = this.store.countPattern(pattern);
		if (count > max && !this.warned.has(pattern)) {
			this.warned.add(pattern);
			this.options.onWarning(
				`Possible listener leak: ${count} listeners registered for "${pattern}" ` +
					`(maxListeners: ${max}). Raise maxListeners or check for missing unsubscribes.`,
			);
		}
	}
}
