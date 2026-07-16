import { Emitter } from '../../src';

type Events = {
	'user.registered': { userId: string };
};

describe('delayed listeners', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('invokes the handler after the delay without blocking emit', async () => {
		const emitter = new Emitter<Events>();
		const handler = jest.fn();

		emitter.on('user.registered', handler, { delay: 1000 });

		const result = await emitter.emit('user.registered', { userId: 'u1' });
		expect(result.outcomes).toEqual([
			{ status: 'scheduled', pattern: 'user.registered', priority: 0 },
		]);
		expect(handler).not.toHaveBeenCalled();

		await jest.advanceTimersByTimeAsync(1000);
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(
			{ userId: 'u1' },
			expect.objectContaining({ name: 'user.registered' }),
		);
	});

	it('cancels pending invocations on unsubscribe', async () => {
		const emitter = new Emitter<Events>();
		const handler = jest.fn();

		const unsubscribe = emitter.on('user.registered', handler, { delay: 1000 });
		await emitter.emit('user.registered', { userId: 'u1' });
		unsubscribe();

		await jest.advanceTimersByTimeAsync(5000);
		expect(handler).not.toHaveBeenCalled();
	});

	it('cancels pending invocations when the AbortSignal aborts', async () => {
		const emitter = new Emitter<Events>();
		const handler = jest.fn();
		const controller = new AbortController();

		emitter.on('user.registered', handler, { delay: 1000, signal: controller.signal });
		await emitter.emit('user.registered', { userId: 'u1' });
		controller.abort();

		await jest.advanceTimersByTimeAsync(5000);
		expect(handler).not.toHaveBeenCalled();
	});

	it('cancels pending invocations via removeAllListeners', async () => {
		const emitter = new Emitter<Events>();
		const handler = jest.fn();

		emitter.on('user.registered', handler, { delay: 1000 });
		await emitter.emit('user.registered', { userId: 'u1' });
		emitter.removeAllListeners();

		await jest.advanceTimersByTimeAsync(5000);
		expect(handler).not.toHaveBeenCalled();
	});

	it('tracks each emit separately for a delayed listener', async () => {
		const emitter = new Emitter<Events>();
		const handler = jest.fn();

		emitter.on('user.registered', handler, { delay: 1000 });
		await emitter.emit('user.registered', { userId: 'u1' });
		await jest.advanceTimersByTimeAsync(500);
		await emitter.emit('user.registered', { userId: 'u2' });

		await jest.advanceTimersByTimeAsync(500);
		expect(handler).toHaveBeenCalledTimes(1);
		await jest.advanceTimersByTimeAsync(500);
		expect(handler).toHaveBeenCalledTimes(2);
	});

	it('routes delayed handler failures to onError hooks', async () => {
		const hook = jest.fn();
		const emitter = new Emitter<Events>({ onError: hook });
		const boom = new Error('boom');

		emitter.on(
			'user.registered',
			() => {
				throw boom;
			},
			{ delay: 100 },
		);

		const result = await emitter.emit('user.registered', { userId: 'u1' });
		expect(result.ok).toBe(true); // failure happens after emit resolved

		await jest.advanceTimersByTimeAsync(100);
		expect(hook).toHaveBeenCalledTimes(1);
		expect(hook.mock.calls[0][0]).toBe(boom);
	});

	it('supports once with delay: single scheduled invocation survives detach', async () => {
		const emitter = new Emitter<Events>();
		const handler = jest.fn();

		emitter.once('user.registered', handler, { delay: 1000 });
		await emitter.emit('user.registered', { userId: 'u1' });
		await emitter.emit('user.registered', { userId: 'u2' });

		await jest.advanceTimersByTimeAsync(1000);
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith({ userId: 'u1' }, expect.anything());
	});
});
