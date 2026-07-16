import { Emitter } from '../../src';

type Events = {
	'user.registered': { userId: string };
	'match.created': { matchId: string };
};

describe('subscriptions', () => {
	it('unsubscribes idempotently', async () => {
		const emitter = new Emitter<Events>();
		const handler = jest.fn();

		const unsubscribe = emitter.on('user.registered', handler);
		unsubscribe();
		unsubscribe();

		await emitter.emit('user.registered', { userId: 'u1' });
		expect(handler).not.toHaveBeenCalled();
	});

	it('fires once-listeners exactly once, even on re-entrant emits', async () => {
		const emitter = new Emitter<Events>();
		let calls = 0;

		emitter.once('user.registered', async (_payload, event) => {
			calls += 1;
			if (event.metadata.reentrant !== true) {
				await emitter.emit('user.registered', { userId: 'u2' }, { metadata: { reentrant: true } });
			}
		});

		await emitter.emit('user.registered', { userId: 'u1' });
		await emitter.emit('user.registered', { userId: 'u3' });
		expect(calls).toBe(1);
	});

	it('removes the listener when its AbortSignal aborts', async () => {
		const emitter = new Emitter<Events>();
		const handler = jest.fn();
		const controller = new AbortController();

		emitter.on('user.registered', handler, { signal: controller.signal });
		await emitter.emit('user.registered', { userId: 'u1' });
		controller.abort();
		await emitter.emit('user.registered', { userId: 'u2' });

		expect(handler).toHaveBeenCalledTimes(1);
		expect(emitter.listenerCount('user.registered')).toBe(0);
	});

	it('treats subscribing with an already-aborted signal as a no-op', async () => {
		const emitter = new Emitter<Events>();
		const handler = jest.fn();
		const controller = new AbortController();
		controller.abort();

		emitter.on('user.registered', handler, { signal: controller.signal });
		await emitter.emit('user.registered', { userId: 'u1' });

		expect(handler).not.toHaveBeenCalled();
		expect(emitter.listenerCount('user.registered')).toBe(0);
	});

	it('reports listenerCount and eventNames', () => {
		const emitter = new Emitter<Events>();
		emitter.on('user.registered', () => undefined);
		emitter.on('user.registered', () => undefined);
		emitter.on('match.created', () => undefined);

		expect(emitter.listenerCount('user.registered')).toBe(2);
		expect(emitter.eventNames().sort()).toEqual(['match.created', 'user.registered']);
	});

	it('removes listeners per pattern or entirely', async () => {
		const emitter = new Emitter<Events>();
		const userHandler = jest.fn();
		const matchHandler = jest.fn();

		emitter.on('user.registered', userHandler);
		emitter.on('match.created', matchHandler);

		emitter.removeAllListeners('user.registered');
		await emitter.emit('user.registered', { userId: 'u1' });
		await emitter.emit('match.created', { matchId: 'm1' });
		expect(userHandler).not.toHaveBeenCalled();
		expect(matchHandler).toHaveBeenCalledTimes(1);

		emitter.removeAllListeners();
		await emitter.emit('match.created', { matchId: 'm2' });
		expect(matchHandler).toHaveBeenCalledTimes(1);
		expect(emitter.eventNames()).toEqual([]);
	});

	it('warns through the onWarning hook when maxListeners is exceeded', () => {
		const onWarning = jest.fn();
		const emitter = new Emitter<Events>({ maxListeners: 2, onWarning });

		emitter.on('user.registered', () => undefined);
		emitter.on('user.registered', () => undefined);
		expect(onWarning).not.toHaveBeenCalled();

		emitter.on('user.registered', () => undefined);
		expect(onWarning).toHaveBeenCalledTimes(1);
		expect(onWarning.mock.calls[0][0]).toContain('user.registered');

		// Warns once per pattern, not on every extra listener.
		emitter.on('user.registered', () => undefined);
		expect(onWarning).toHaveBeenCalledTimes(1);
	});

	it('treats maxListeners 0 as unlimited', () => {
		const onWarning = jest.fn();
		const emitter = new Emitter<Events>({ maxListeners: 0, onWarning });

		for (let i = 0; i < 500; i += 1) {
			emitter.on('user.registered', () => undefined);
		}
		expect(onWarning).not.toHaveBeenCalled();
	});

	it('rejects negative maxListeners and negative delay', () => {
		expect(() => new Emitter<Events>({ maxListeners: -1 })).toThrow(RangeError);

		const emitter = new Emitter<Events>();
		expect(() => emitter.on('user.registered', () => undefined, { delay: -5 })).toThrow(
			RangeError,
		);
	});

	it('dispose clears listeners, middleware, hooks, and channels', async () => {
		const emitter = new Emitter<Events>();
		const handler = jest.fn();
		const middleware = jest.fn((_event, next) => next());
		const channelHandler = jest.fn();

		emitter.on('user.registered', handler);
		emitter.use(middleware);
		emitter.channel('geo:eu').on('user.registered', channelHandler);

		emitter.dispose();

		await emitter.emit('user.registered', { userId: 'u1' });
		await emitter.channel('geo:eu').emit('user.registered', { userId: 'u1' });

		expect(handler).not.toHaveBeenCalled();
		expect(middleware).not.toHaveBeenCalled();
		expect(channelHandler).not.toHaveBeenCalled();
	});
});
