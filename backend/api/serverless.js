import Fastify from 'fastify';
import { app as main } from '../src/app'; // eslint-disable-line import/extensions

const app = Fastify({
	logger: false,
});

app.register(main);

export default async (req, res) =>
{
	await app.ready();
	app.server.emit('request', req, res);
};
