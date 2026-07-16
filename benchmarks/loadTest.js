const { Emitter } = require('../dist/index');

const run = async () => {
	const emitter = new Emitter({ maxListeners: 0 });

	let high = 0;
	let medium = 0;
	let low = 0;
	let wildcard = 0;

	emitter.on('user.loggedIn', () => void (high += 1), { priority: 100 });
	emitter.on('user.loggedIn', () => void (medium += 1), { priority: 50 });
	emitter.on('user.loggedIn', () => void (low += 1), { priority: 10 });
	emitter.on('user.*', () => void (wildcard += 1));
	emitter.on('system.check', () => undefined);
	emitter.on('data.update', () => undefined);

	const iterations = 1_000_000;

	console.time('emitLoop');
	for (let i = 0; i < iterations; i += 1) {
		await emitter.emit('user.loggedIn', { userId: `user-${i}` });
		if (i % 100 === 0) {
			await emitter.emit('system.check', { at: i });
			await emitter.emit('data.update', { at: i });
		}
	}
	console.timeEnd('emitLoop');

	console.log({ high, medium, low, wildcard });
};

run().catch(error => {
	console.error(error);
	process.exit(1);
});
