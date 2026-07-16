/** Thrown by emit under the 'fail-fast' error policy. */
export class EmitError extends Error {
	readonly cause: unknown;
	readonly eventName: string;
	readonly eventId: string;

	constructor(eventName: string, eventId: string, cause: unknown) {
		const reason = cause instanceof Error ? cause.message : String(cause);
		super(`Handler for "${eventName}" failed: ${reason}`);
		this.name = 'EmitError';
		this.cause = cause;
		this.eventName = eventName;
		this.eventId = eventId;
	}
}

/** Rejection reason for waitFor when timeoutMs elapses. */
export class TimeoutError extends Error {
	constructor(pattern: string, timeoutMs: number) {
		super(`Timed out after ${timeoutMs}ms waiting for "${pattern}"`);
		this.name = 'TimeoutError';
	}
}

/** Rejection reason for waitFor when its AbortSignal aborts. */
export class AbortError extends Error {
	constructor(pattern: string) {
		super(`Aborted while waiting for "${pattern}"`);
		this.name = 'AbortError';
	}
}
