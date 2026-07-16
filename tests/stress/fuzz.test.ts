import { Emitter } from '../../src';

type Events = {
	'user.registered': { n: number };
	'user.verified': { n: number };
	'user.profile.updated': { n: number };
	'match.created': { n: number };
	'match.ended': { n: number };
	'msg.sent': { n: number };
};

type Name = keyof Events & string;

const NAMES: Name[] = [
	'user.registered',
	'user.verified',
	'user.profile.updated',
	'match.created',
	'match.ended',
	'msg.sent',
];
const PATTERNS: string[] = [...NAMES, 'user.*', 'match.*', '*'];

// Deterministic PRNG (mulberry32) so failures are reproducible by seed.
const prng = (seed: number): (() => number) => {
	let state = seed;
	return () => {
		state |= 0;
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

const matches = (pattern: string, name: string): boolean => {
	if (pattern === '*') return true;
	if (pattern.endsWith('.*')) return name.startsWith(pattern.slice(0, -1));
	return pattern === name;
};

interface ModelSub {
	pattern: string;
	once: boolean;
	active: boolean;
	calls: number;
	expected: number;
	off: () => void;
}

describe('fuzz: random op sequences vs reference model', () => {
	jest.setTimeout(120_000);

	test.each([[1], [42], [20260716]])('seed %d, 5000 operations', async seed => {
		const random = prng(seed);
		const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)];

		const emitter = new Emitter<Events>({ maxListeners: 0 });
		const subs: ModelSub[] = [];
		const active = (): ModelSub[] => subs.filter(s => s.active);

		for (let op = 0; op < 5_000; op += 1) {
			const roll = random();

			if (roll < 0.4) {
				// subscribe (on or once, exact or wildcard, random priority)
				const pattern = pick(PATTERNS);
				const once = random() < 0.3;
				const sub: ModelSub = {
					pattern,
					once,
					active: true,
					calls: 0,
					expected: 0,
					off: () => undefined,
				};
				const handler = (): void => void (sub.calls += 1);
				const options = { priority: Math.floor(random() * 10) };
				sub.off = once
					? emitter.once(pattern as never, handler, options)
					: emitter.on(pattern as never, handler, options);
				subs.push(sub);
			} else if (roll < 0.6) {
				// unsubscribe a random active listener
				const candidates = active();
				if (candidates.length > 0) {
					const sub = pick(candidates);
					sub.off();
					sub.active = false;
				}
			} else if (roll < 0.95) {
				// emit a random event; verify dispatch count against the model
				const name = pick(NAMES);
				const matching = active().filter(s => matches(s.pattern, name));
				for (const sub of matching) {
					sub.expected += 1;
					if (sub.once) sub.active = false;
				}
				const result = await emitter.emit(name, { n: op });
				if (result.outcomes.length !== matching.length || !result.ok) {
					throw new Error(
						`seed ${seed} op ${op}: emit('${name}') dispatched ${result.outcomes.length}, ` +
							`model expected ${matching.length}, ok=${result.ok}`,
					);
				}
			} else if (roll < 0.99) {
				// remove all listeners for one pattern string
				const pattern = pick(PATTERNS);
				for (const sub of subs) {
					if (sub.active && sub.pattern === pattern) sub.active = false;
				}
				emitter.removeAllListeners(pattern as never);
			} else {
				// remove everything
				for (const sub of subs) sub.active = false;
				emitter.removeAllListeners();
			}

			// Invariant: listener counts agree with the model for every event name.
			for (const name of NAMES) {
				const expected = active().filter(s => matches(s.pattern, name)).length;
				const actual = emitter.listenerCount(name);
				if (actual !== expected) {
					throw new Error(
						`seed ${seed} op ${op}: listenerCount('${name}') = ${actual}, model = ${expected}`,
					);
				}
			}
		}

		// Every handler was called exactly as often as the model predicted.
		for (const [index, sub] of subs.entries()) {
			if (sub.calls !== sub.expected) {
				throw new Error(
					`seed ${seed}: sub #${index} (${sub.pattern}, once=${sub.once}) ` +
						`called ${sub.calls} times, model expected ${sub.expected}`,
				);
			}
		}
	});
});
