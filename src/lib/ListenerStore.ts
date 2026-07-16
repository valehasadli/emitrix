export type InternalHandler = (payload: unknown, event: unknown) => void | Promise<void>;

export interface ListenerEntry {
	readonly seq: number;
	readonly pattern: string;
	/** null = exact match; '' = match all ('*'); 'user.' = prefix ('user.*'). */
	readonly prefix: string | null;
	readonly handler: InternalHandler;
	readonly priority: number;
	readonly delay?: number;
	once: boolean;
	removed: boolean;
	pendingTimers: Set<ReturnType<typeof setTimeout>>;
	detachSignal?: () => void;
}

export const parsePrefix = (pattern: string): string | null => {
	if (pattern === '*') {
		return '';
	}
	if (pattern.endsWith('.*')) {
		return pattern.slice(0, -1); // 'user.*' -> 'user.'
	}
	return null;
};

const byPriority = (a: ListenerEntry, b: ListenerEntry): number =>
	b.priority - a.priority || a.seq - b.seq;

/** Insert keeping the bucket sorted by priority desc, then insertion order. */
const sortedInsert = (bucket: ListenerEntry[], entry: ListenerEntry): void => {
	let index = bucket.findIndex(item => item.priority < entry.priority);
	if (index === -1) {
		index = bucket.length;
	}
	bucket.splice(index, 0, entry);
};

export class ListenerStore {
	private exact = new Map<string, ListenerEntry[]>();
	private patterns: ListenerEntry[] = [];

	add(entry: ListenerEntry): void {
		if (entry.prefix === null) {
			let bucket = this.exact.get(entry.pattern);
			if (!bucket) {
				bucket = [];
				this.exact.set(entry.pattern, bucket);
			}
			sortedInsert(bucket, entry);
		} else {
			sortedInsert(this.patterns, entry);
		}
	}

	remove(entry: ListenerEntry): void {
		const bucket = entry.prefix === null ? this.exact.get(entry.pattern) : this.patterns;
		if (!bucket) {
			return;
		}
		const index = bucket.indexOf(entry);
		if (index !== -1) {
			bucket.splice(index, 1);
		}
		if (entry.prefix === null && bucket.length === 0) {
			this.exact.delete(entry.pattern);
		}
	}

	/** All entries that fire for an emitted event name, in dispatch order. */
	collect(name: string): ListenerEntry[] {
		const exact = this.exact.get(name) ?? [];
		const matching = this.patterns.filter(entry => name.startsWith(entry.prefix as string));
		if (matching.length === 0) {
			return exact.slice();
		}
		return [...exact, ...matching].sort(byPriority);
	}

	/** Number of listeners that would fire for an emitted event name. */
	countFor(name: string): number {
		const exact = this.exact.get(name)?.length ?? 0;
		let matching = 0;
		for (const entry of this.patterns) {
			if (name.startsWith(entry.prefix as string)) {
				matching += 1;
			}
		}
		return exact + matching;
	}

	/** Number of listeners registered under exactly this pattern string. */
	countPattern(pattern: string): number {
		if (parsePrefix(pattern) === null) {
			return this.exact.get(pattern)?.length ?? 0;
		}
		return this.patterns.filter(entry => entry.pattern === pattern).length;
	}

	eventNames(): string[] {
		return [...this.exact.keys()];
	}

	/** Remove and return entries: all of them, or those under one pattern string. */
	take(pattern?: string): ListenerEntry[] {
		if (pattern === undefined) {
			const all = ([] as ListenerEntry[]).concat(...this.exact.values(), this.patterns);
			this.exact.clear();
			this.patterns = [];
			return all;
		}
		if (parsePrefix(pattern) === null) {
			const bucket = this.exact.get(pattern) ?? [];
			this.exact.delete(pattern);
			return bucket;
		}
		const taken = this.patterns.filter(entry => entry.pattern === pattern);
		this.patterns = this.patterns.filter(entry => entry.pattern !== pattern);
		return taken;
	}
}
