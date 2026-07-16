import { Emitter, Middleware } from '../../src';

type Events = {
	'user.registered': { userId: string };
};

describe('middleware', () => {
	it('wraps handler dispatch in registration order', async () => {
		const emitter = new Emitter<Events>();
		const order: string[] = [];

		emitter.use(async (_event, next) => {
			order.push('outer:before');
			await next();
			order.push('outer:after');
		});
		emitter.use(async (_event, next) => {
			order.push('inner:before');
			await next();
			order.push('inner:after');
		});
		emitter.on('user.registered', () => void order.push('handler'));

		await emitter.emit('user.registered', { userId: 'u1' });
		expect(order).toEqual(['outer:before', 'inner:before', 'handler', 'inner:after', 'outer:after']);
	});

	it('lets middleware enrich event metadata before handlers run', async () => {
		const emitter = new Emitter<Events>();
		let seenTraceId: unknown;

		emitter.use((event, next) => {
			event.metadata.traceId = 'trace-42';
			return next();
		});
		emitter.on('user.registered', (_payload, event) => {
			seenTraceId = event.metadata.traceId;
		});

		const result = await emitter.emit('user.registered', { userId: 'u1' });
		expect(seenTraceId).toBe('trace-42');
		expect(result.event.metadata.traceId).toBe('trace-42');
	});

	it('skips handlers when middleware does not call next', async () => {
		const emitter = new Emitter<Events>();
		const handler = jest.fn();

		emitter.use(() => undefined);
		emitter.on('user.registered', handler);

		const result = await emitter.emit('user.registered', { userId: 'u1' });
		expect(handler).not.toHaveBeenCalled();
		expect(result.outcomes).toEqual([]);
		expect(result.ok).toBe(true);
	});

	it('does not consume once-listeners when middleware short-circuits', async () => {
		const emitter = new Emitter<Events>();
		const handler = jest.fn();

		const removeGate = emitter.use(() => undefined);
		emitter.once('user.registered', handler);

		await emitter.emit('user.registered', { userId: 'u1' });
		expect(handler).not.toHaveBeenCalled();

		removeGate();
		await emitter.emit('user.registered', { userId: 'u2' });
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it('propagates middleware errors to the emit caller', async () => {
		const emitter = new Emitter<Events>();
		emitter.use(() => {
			throw new Error('middleware boom');
		});

		await expect(emitter.emit('user.registered', { userId: 'u1' })).rejects.toThrow(
			'middleware boom',
		);
	});

	it('supports removing middleware', async () => {
		const emitter = new Emitter<Events>();
		const middleware: Middleware<Events> = jest.fn((_event, next) => next());

		const remove = emitter.use(middleware);
		await emitter.emit('user.registered', { userId: 'u1' });
		remove();
		await emitter.emit('user.registered', { userId: 'u2' });

		expect(middleware).toHaveBeenCalledTimes(1);
	});
});
