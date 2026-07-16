import { Emitter } from '../../src';

type Events = {
	'user.registered': { userId: string };
};

describe('channels', () => {
	it('returns the same instance for the same name', () => {
		const emitter = new Emitter<Events>();
		expect(emitter.channel('geo:eu')).toBe(emitter.channel('geo:eu'));
		expect(emitter.channel('geo:eu')).not.toBe(emitter.channel('geo:us'));
	});

	it('isolates listeners between channels and the root emitter', async () => {
		const emitter = new Emitter<Events>();
		const rootHandler = jest.fn();
		const euHandler = jest.fn();
		const usHandler = jest.fn();

		emitter.on('user.registered', rootHandler);
		emitter.channel('geo:eu').on('user.registered', euHandler);
		emitter.channel('geo:us').on('user.registered', usHandler);

		await emitter.channel('geo:eu').emit('user.registered', { userId: 'u1' });

		expect(euHandler).toHaveBeenCalledTimes(1);
		expect(usHandler).not.toHaveBeenCalled();
		expect(rootHandler).not.toHaveBeenCalled();
	});

	it('inherits the parent configuration', async () => {
		const onError = jest.fn();
		const emitter = new Emitter<Events>({ errorPolicy: 'aggregate', onError });

		emitter.channel('geo:eu').on('user.registered', () => {
			throw new Error('boom');
		});

		const result = await emitter.channel('geo:eu').emit('user.registered', { userId: 'u1' });
		expect(result.ok).toBe(false);
		expect(onError).toHaveBeenCalledTimes(1);
	});
});
