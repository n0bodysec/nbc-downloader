import { fastify, FastifyReply, FastifyRequest } from 'fastify';

const app = fastify({
	logger: false,
});

app.register(import('../app'));

export default async (req: FastifyRequest, res: FastifyReply) =>
{
	await app.ready();
	app.server.emit('request', req, res);
};
