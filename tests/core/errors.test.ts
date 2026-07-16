import { EmitError, Emitter } from '../../src';

type Events = {
	'user.registered': { userId: string };
};

describe('error handling', () => {
	it('captures synchronous handler errors under aggregate policy', async () => {
		const emitter = new Emitter<Events>();
		const boom = new Error('boom');
		const after = jest.fn();

		emitter.on('user.registered', () => {
			throw boom;
		});
		emitter.on('user.registered', after);

		const result = await emitter.emit('user.registered', { userId: 'u1' });

		expect(after).toHaveBeenCalledTimes(1);
		expect(result.ok).toBe(false);
		expect(result.errors).toEqual([boom]);
		expect(result.outcomes.map(o => o.status)).toEqual(['error', 'ok']);
	});

	it('captures async handler rejections (not unhandled rejections)', async () => {
		const emitter = new Emitter<Events>();
		const boom = new Error('async boom');

		emitter.on('user.registered', async () => {
			await new Promise(resolve => setTimeout(resolve, 5));
			throw boom;
		});

		const result = await emitter.emit('user.registered', { userId: 'u1' });
		expect(result.ok).toBe(false);
		expect(result.errors).toEqual([boom]);
	});

	it('rejects with EmitError on first failure under fail-fast', async () => {
		const emitter = new Emitter<Events>({ errorPolicy: 'fail-fast' });
		const boom = new Error('boom');
		const after = jest.fn();

		emitter.on('user.registered', () => {
			throw boom;
		});
		emitter.on('user.registered', after);

		await expect(emitter.emit('user.registered', { userId: 'u1' })).rejects.toThrow(EmitError);
		expect(after).not.toHaveBeenCalled();
	});

	it('exposes cause and event identity on EmitError', async () => {
		const emitter = new Emitter<Events>({ errorPolicy: 'fail-fast' });
		const boom = new Error('boom');
		emitter.on('user.registered', () => {
			throw boom;
		});

		try {
			await emitter.emit('user.registered', { userId: 'u1' });
			throw new Error('should have rejected');
		} catch (error) {
			const emitError = error as EmitError;
			expect(emitError).toBeInstanceOf(EmitError);
			expect(emitError.cause).toBe(boom);
			expect(emitError.eventName).toBe('user.registered');
			expect(emitError.eventId).toEqual(expect.any(String));
		}
	});

	it('allows overriding error policy per emit', async () => {
		const emitter = new Emitter<Events>({ errorPolicy: 'aggregate' });
		emitter.on('user.registered', () => {
			throw new Error('boom');
		});

		await expect(
			emitter.emit('user.registered', { userId: 'u1' }, { errorPolicy: 'fail-fast' }),
		).rejects.toThrow(EmitError);
	});

	it('notifies onError hooks with error, envelope, and listener info', async () => {
		const hook = jest.fn();
		const emitter = new Emitter<Events>({ onError: hook });
		const boom = new Error('boom');

		emitter.on(
			'user.registered',
			() => {
				throw boom;
			},
			{ priority: 7 },
		);

		await emitter.emit('user.registered', { userId: 'u1' });

		expect(hook).toHaveBeenCalledTimes(1);
		const [error, event, listener] = hook.mock.calls[0];
		expect(error).toBe(boom);
		expect(event.name).toBe('user.registered');
		expect(listener).toEqual({ pattern: 'user.registered', priority: 7 });
	});

	it('supports registering and removing onError hooks', async () => {
		const emitter = new Emitter<Events>();
		const hook = jest.fn();
		const remove = emitter.onError(hook);

		emitter.on('user.registered', () => {
			throw new Error('boom');
		});

		await emitter.emit('user.registered', { userId: 'u1' });
		expect(hook).toHaveBeenCalledTimes(1);

		remove();
		await emitter.emit('user.registered', { userId: 'u1' });
		expect(hook).toHaveBeenCalledTimes(1);
	});

	it('survives a throwing onError hook', async () => {
		const emitter = new Emitter<Events>({
			onError: () => {
				throw new Error('hook exploded');
			},
		});
		emitter.on('user.registered', () => {
			throw new Error('boom');
		});

		const result = await emitter.emit('user.registered', { userId: 'u1' });
		expect(result.ok).toBe(false);
	});
});
