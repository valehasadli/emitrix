import { AbortError, Emitter, TimeoutError } from '../../src';

type Events = {
	'user.registered': { userId: string };
	'user.verified': { userId: string };
};

describe('waitFor', () => {
	it('resolves with the payload of the next matching event', async () => {
		const emitter = new Emitter<Events>();

		const pending = emitter.waitFor('user.registered');
		await emitter.emit('user.registered', { userId: 'u1' });

		await expect(pending).resolves.toEqual({ userId: 'u1' });
		expect(emitter.listenerCount('user.registered')).toBe(0);
	});

	it('applies a filter predicate', async () => {
		const emitter = new Emitter<Events>();

		const pending = emitter.waitFor('user.registered', {
			filter: payload => payload.userId === 'u2',
		});
		await emitter.emit('user.registered', { userId: 'u1' });
		await emitter.emit('user.registered', { userId: 'u2' });

		await expect(pending).resolves.toEqual({ userId: 'u2' });
	});

	it('works with wildcard patterns', async () => {
		const emitter = new Emitter<Events>();

		const pending = emitter.waitFor('user.*');
		await emitter.emit('user.verified', { userId: 'u1' });

		await expect(pending).resolves.toEqual({ userId: 'u1' });
	});

	it('rejects with TimeoutError when timeoutMs elapses', async () => {
		const emitter = new Emitter<Events>();

		await expect(emitter.waitFor('user.registered', { timeoutMs: 10 })).rejects.toThrow(
			TimeoutError,
		);
		expect(emitter.listenerCount('user.registered')).toBe(0);
	});

	it('rejects with AbortError when the signal aborts', async () => {
		const emitter = new Emitter<Events>();
		const controller = new AbortController();

		const pending = emitter.waitFor('user.registered', { signal: controller.signal });
		controller.abort();

		await expect(pending).rejects.toThrow(AbortError);
		expect(emitter.listenerCount('user.registered')).toBe(0);
	});

	it('rejects immediately when the signal is already aborted', async () => {
		const emitter = new Emitter<Events>();
		const controller = new AbortController();
		controller.abort();

		await expect(
			emitter.waitFor('user.registered', { signal: controller.signal }),
		).rejects.toThrow(AbortError);
	});
});
