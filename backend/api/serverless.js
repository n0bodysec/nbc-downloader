'use strict'; // eslint-disable-line

import Fastify from 'fastify';

const app = Fastify({
	logger: false,
});

app.register(import('../src/app.js'));

export default async (req, res) =>
{
	await app.ready();
	app.server.emit('request', req, res);
};
