import { Emitter, TimeoutError } from '../../src';

type Events = {
	'user.registered': { userId: string };
	'user.verified': { userId: string };
	'match.created': { matchId: string };
};

const forceGc = (): boolean => {
	const gc = (globalThis as { gc?: () => void }).gc;
	if (gc) {
		gc();
		gc();
		return true;
	}
	return false;
};

describe('soak', () => {
	jest.setTimeout(120_000);

	it('200k subscribe/emit/unsubscribe cycles do not leak listeners or memory', async () => {
		const emitter = new Emitter<Events>({ maxListeners: 0 });
		let standingCalls = 0;
		for (let i = 0; i < 50; i += 1) {
			emitter.on('user.registered', () => void (standingCalls += 1));
		}
		const baselineCount = emitter.listenerCount('user.registered');

		// Warm up allocators before measuring.
		for (let i = 0; i < 10_000; i += 1) {
			const off = emitter.on('user.registered', () => undefined);
			off();
		}
		const gcAvailable = forceGc();
		const heapBefore = process.memoryUsage().heapUsed;

		const cycles = 200_000;
		let transientCalls = 0;
		for (let i = 0; i < cycles; i += 1) {
			const off = emitter.on('user.registered', () => void (transientCalls += 1), {
				priority: i % 7,
			});
			if (i % 100 === 0) {
				await emitter.emit('user.registered', { userId: `u${i}` });
			}
			off();
		}

		expect(emitter.listenerCount('user.registered')).toBe(baselineCount);
		expect(standingCalls).toBe((cycles / 100) * 50);
		expect(transientCalls).toBe(cycles / 100); // transient listener was live during its emit

		if (gcAvailable) {
			forceGc();
			const growth = process.memoryUsage().heapUsed - heapBefore;
			// Generous bound: the cycle above must not accumulate per-subscription state.
			expect(growth).toBeLessThan(10 * 1024 * 1024);
		}
	});

	it('10k concurrent waitFor calls resolve from one emit and fully clean up', async () => {
		const emitter = new Emitter<Events>({ maxListeners: 0 });

		const pending: Promise<Events['user.verified']>[] = [];
		for (let i = 0; i < 10_000; i += 1) {
			pending.push(emitter.waitFor('user.verified'));
		}
		expect(emitter.listenerCount('user.verified')).toBe(10_000);

		await emitter.emit('user.verified', { userId: 'u1' });
		const results = await Promise.all(pending);

		expect(results).toHaveLength(10_000);
		expect(results.every(r => r.userId === 'u1')).toBe(true);
		expect(emitter.listenerCount('user.verified')).toBe(0);
	});

	it('5k timed-out waitFor calls leave no listeners behind', async () => {
		const emitter = new Emitter<Events>({ maxListeners: 0 });

		const pending: Promise<unknown>[] = [];
		for (let i = 0; i < 5_000; i += 1) {
			pending.push(
				emitter.waitFor('user.verified', { timeoutMs: 1 }).then(
					() => {
						throw new Error('should have timed out');
					},
					error => {
						expect(error).toBeInstanceOf(TimeoutError);
					},
				),
			);
		}

		await Promise.all(pending);
		expect(emitter.listenerCount('user.verified')).toBe(0);
	});

	it('repeated channel create/dispose cycles do not accumulate state', async () => {
		const emitter = new Emitter<Events>({ maxListeners: 0 });

		for (let i = 0; i < 20_000; i += 1) {
			const channel = emitter.channel(`tenant:${i % 100}`);
			const off = channel.on('match.created', () => undefined);
			off();
		}
		// Channels are cached by name: 100 instances, each with zero listeners.
		for (let i = 0; i < 100; i += 1) {
			expect(emitter.channel(`tenant:${i}`).listenerCount('match.created')).toBe(0);
		}
	});
});
