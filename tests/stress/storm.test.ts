import { EmitError, Emitter } from '../../src';

type Events = {
	'user.registered': { n: number };
	'match.created': { n: number };
};

describe('storm', () => {
	jest.setTimeout(120_000);

	it('500 concurrent emits x 50 async listeners lose nothing', async () => {
		const emitter = new Emitter<Events>({ maxListeners: 0, dispatch: 'parallel' });
		let calls = 0;

		for (let i = 0; i < 50; i += 1) {
			emitter.on('user.registered', async () => {
				// Random microtask/macrotask yields to shuffle interleaving.
				if (i % 3 === 0) await Promise.resolve();
				if (i % 7 === 0) await new Promise(resolve => setTimeout(resolve, 0));
				calls += 1;
			});
		}

		const emits: Promise<unknown>[] = [];
		for (let n = 0; n < 500; n += 1) {
			emits.push(emitter.emit('user.registered', { n }));
		}
		const results = await Promise.all(emits);

		expect(calls).toBe(500 * 50);
		expect(results).toHaveLength(500);
	});

	it('100k emits with 50% failing handlers: every failure accounted for, none unhandled', async () => {
		const unhandled: unknown[] = [];
		const onUnhandled = (reason: unknown): void => void unhandled.push(reason);
		process.on('unhandledRejection', onUnhandled);

		try {
			let hookCalls = 0;
			const emitter = new Emitter<Events>({
				maxListeners: 0,
				onError: () => void (hookCalls += 1),
			});

			let good = 0;
			emitter.on('match.created', async ({ n }) => {
				if (n % 2 === 0) throw new Error(`boom ${n}`);
				good += 1;
			});

			const iterations = 100_000;
			let failedResults = 0;
			for (let n = 0; n < iterations; n += 1) {
				const result = await emitter.emit('match.created', { n });
				if (!result.ok) failedResults += 1;
			}

			expect(good).toBe(iterations / 2);
			expect(failedResults).toBe(iterations / 2);
			expect(hookCalls).toBe(iterations / 2);

			// Give any stray rejection a chance to surface before asserting.
			await new Promise(resolve => setTimeout(resolve, 50));
			expect(unhandled).toEqual([]);
		} finally {
			process.off('unhandledRejection', onUnhandled);
		}
	});

	it('fail-fast under concurrent emits rejects cleanly without leaking rejections', async () => {
		const unhandled: unknown[] = [];
		const onUnhandled = (reason: unknown): void => void unhandled.push(reason);
		process.on('unhandledRejection', onUnhandled);

		try {
			const emitter = new Emitter<Events>({ maxListeners: 0, errorPolicy: 'fail-fast' });
			emitter.on(
				'match.created',
				() => {
					throw new Error('boom');
				},
				{ priority: 100 },
			);
			emitter.on('match.created', () => undefined);

			const results = await Promise.allSettled(
				Array.from({ length: 5_000 }, (_, n) => emitter.emit('match.created', { n })),
			);

			expect(results.every(r => r.status === 'rejected')).toBe(true);
			expect(
				results.every(r => r.status === 'rejected' && r.reason instanceof EmitError),
			).toBe(true);

			await new Promise(resolve => setTimeout(resolve, 50));
			expect(unhandled).toEqual([]);
		} finally {
			process.off('unhandledRejection', onUnhandled);
		}
	});

	it('5k pending delayed invocations: unsubscribed listener fires zero times', async () => {
		const emitter = new Emitter<Events>({ maxListeners: 0 });
		let kept = 0;
		let cancelled = 0;

		// Delay chosen so all 5k emits complete well before the first timer fires.
		emitter.on('user.registered', () => void (kept += 1), { delay: 500 });
		const offCancelled = emitter.on('user.registered', () => void (cancelled += 1), {
			delay: 500,
		});

		for (let n = 0; n < 5_000; n += 1) {
			await emitter.emit('user.registered', { n });
		}
		offCancelled(); // must clear all 5k pending timers for this listener

		await new Promise(resolve => setTimeout(resolve, 800));

		expect(kept).toBe(5_000);
		expect(cancelled).toBe(0);
	});
});
