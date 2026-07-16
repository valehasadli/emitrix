import { Emitter } from '../../src';

type Events = {
	'user.registered': { userId: string };
	'user.profile.updated': { userId: string; field: string };
	'match.created': { matchId: string };
};

describe('wildcard subscriptions', () => {
	it("matches prefix wildcards like 'user.*'", async () => {
		const emitter = new Emitter<Events>();
		const seen: string[] = [];

		emitter.on('user.*', (_payload, event) => {
			seen.push(event.name);
		});

		await emitter.emit('user.registered', { userId: 'u1' });
		await emitter.emit('user.profile.updated', { userId: 'u1', field: 'bio' });
		await emitter.emit('match.created', { matchId: 'm1' });

		expect(seen).toEqual(['user.registered', 'user.profile.updated']);
	});

	it("matches every event with '*'", async () => {
		const emitter = new Emitter<Events>();
		const seen: string[] = [];

		emitter.on('*', (_payload, event) => {
			seen.push(event.name);
		});

		await emitter.emit('user.registered', { userId: 'u1' });
		await emitter.emit('match.created', { matchId: 'm1' });

		expect(seen).toEqual(['user.registered', 'match.created']);
	});

	it('interleaves exact and wildcard listeners by priority', async () => {
		const emitter = new Emitter<Events>();
		const order: string[] = [];

		emitter.on('user.registered', () => void order.push('exact:0'));
		emitter.on('user.*', () => void order.push('wild:10'), { priority: 10 });
		emitter.on('user.registered', () => void order.push('exact:20'), { priority: 20 });
		emitter.on('*', () => void order.push('all:5'), { priority: 5 });

		await emitter.emit('user.registered', { userId: 'u1' });
		expect(order).toEqual(['exact:20', 'wild:10', 'all:5', 'exact:0']);
	});

	it('counts wildcard listeners in listenerCount for matching names', () => {
		const emitter = new Emitter<Events>();
		emitter.on('user.registered', () => undefined);
		emitter.on('user.*', () => undefined);
		emitter.on('*', () => undefined);

		expect(emitter.listenerCount('user.registered')).toBe(3);
		expect(emitter.listenerCount('match.created')).toBe(1);
	});

	it('supports unsubscribing wildcard listeners', async () => {
		const emitter = new Emitter<Events>();
		const handler = jest.fn();

		const unsubscribe = emitter.on('user.*', handler);
		await emitter.emit('user.registered', { userId: 'u1' });
		unsubscribe();
		await emitter.emit('user.registered', { userId: 'u2' });

		expect(handler).toHaveBeenCalledTimes(1);
	});

	it('supports once on wildcard patterns', async () => {
		const emitter = new Emitter<Events>();
		const handler = jest.fn();

		emitter.once('user.*', handler);
		await emitter.emit('user.registered', { userId: 'u1' });
		await emitter.emit('user.profile.updated', { userId: 'u1', field: 'bio' });

		expect(handler).toHaveBeenCalledTimes(1);
	});
});
