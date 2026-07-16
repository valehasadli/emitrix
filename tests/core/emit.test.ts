import { Emitter } from '../../src';

type Events = {
	'user.registered': { userId: string };
	'match.created': { matchId: string };
};

describe('emit', () => {
	it('awaits async handlers before resolving', async () => {
		const emitter = new Emitter<Events>();
		const calls: string[] = [];

		emitter.on('user.registered', async ({ userId }) => {
			await new Promise(resolve => setTimeout(resolve, 10));
			calls.push(`slow:${userId}`);
		});
		emitter.on('user.registered', ({ userId }) => {
			calls.push(`fast:${userId}`);
		});

		const result = await emitter.emit('user.registered', { userId: 'u1' });

		expect(calls).toEqual(['slow:u1', 'fast:u1']);
		expect(result.ok).toBe(true);
		expect(result.outcomes).toHaveLength(2);
		expect(result.outcomes.every(o => o.status === 'ok')).toBe(true);
	});

	it('passes payload and a full envelope to handlers', async () => {
		const emitter = new Emitter<Events>();
		const seen: unknown[] = [];

		emitter.on('user.registered', (payload, event) => {
			seen.push({ payload, event });
		});

		const result = await emitter.emit(
			'user.registered',
			{ userId: 'u1' },
			{ correlationId: 'corr-1', causationId: 'cmd-9', metadata: { source: 'api' } },
		);

		expect(seen).toHaveLength(1);
		const { payload, event } = seen[0] as {
			payload: Events['user.registered'];
			event: (typeof result)['event'];
		};
		expect(payload).toEqual({ userId: 'u1' });
		expect(event.name).toBe('user.registered');
		expect(event.id).toEqual(expect.any(String));
		expect(event.timestamp).toEqual(expect.any(Number));
		expect(event.correlationId).toBe('corr-1');
		expect(event.causationId).toBe('cmd-9');
		expect(event.metadata).toEqual({ source: 'api' });
	});

	it('defaults correlationId to the event id', async () => {
		const emitter = new Emitter<Events>();
		const result = await emitter.emit('user.registered', { userId: 'u1' });
		expect(result.event.correlationId).toBe(result.event.id);
	});

	it('generates a unique id per event', async () => {
		const emitter = new Emitter<Events>();
		const a = await emitter.emit('user.registered', { userId: 'u1' });
		const b = await emitter.emit('user.registered', { userId: 'u2' });
		expect(a.event.id).not.toBe(b.event.id);
	});

	it('resolves with an empty result when there are no listeners', async () => {
		const emitter = new Emitter<Events>();
		const result = await emitter.emit('match.created', { matchId: 'm1' });
		expect(result.ok).toBe(true);
		expect(result.outcomes).toEqual([]);
		expect(result.errors).toEqual([]);
	});

	it('runs sequential handlers in priority order (higher first)', async () => {
		const emitter = new Emitter<Events>();
		const order: number[] = [];

		emitter.on('user.registered', () => void order.push(0));
		emitter.on('user.registered', () => void order.push(100), { priority: 100 });
		emitter.on('user.registered', () => void order.push(50), { priority: 50 });

		await emitter.emit('user.registered', { userId: 'u1' });
		expect(order).toEqual([100, 50, 0]);
	});

	it('preserves registration order among equal priorities', async () => {
		const emitter = new Emitter<Events>();
		const order: string[] = [];

		emitter.on('user.registered', () => void order.push('a'));
		emitter.on('user.registered', () => void order.push('b'));
		emitter.on('user.registered', () => void order.push('c'));

		await emitter.emit('user.registered', { userId: 'u1' });
		expect(order).toEqual(['a', 'b', 'c']);
	});

	it('starts handlers concurrently in parallel mode', async () => {
		const emitter = new Emitter<Events>({ dispatch: 'parallel' });
		const order: string[] = [];

		emitter.on('user.registered', async () => {
			order.push('slow:start');
			await new Promise(resolve => setTimeout(resolve, 20));
			order.push('slow:end');
		});
		emitter.on('user.registered', async () => {
			order.push('fast:start');
			order.push('fast:end');
		});

		await emitter.emit('user.registered', { userId: 'u1' });
		expect(order).toEqual(['slow:start', 'fast:start', 'fast:end', 'slow:end']);
	});

	it('allows overriding dispatch mode per emit', async () => {
		const emitter = new Emitter<Events>({ dispatch: 'sequential' });
		const order: string[] = [];

		emitter.on('user.registered', async () => {
			await new Promise(resolve => setTimeout(resolve, 20));
			order.push('slow');
		});
		emitter.on('user.registered', () => void order.push('fast'));

		await emitter.emit('user.registered', { userId: 'u1' }, { dispatch: 'parallel' });
		expect(order).toEqual(['fast', 'slow']);
	});
});
