import cors from '@fastify/cors';
import fstatic from '@fastify/static';
import { FastifyInstance, FastifyPluginOptions, HookHandlerDoneFunction } from 'fastify';
import path from 'path';
import m3u8 from './routes/m3u8';

// eslint-disable-next-line import/prefer-default-export
export async function app(instance: FastifyInstance, opts: FastifyPluginOptions, done: HookHandlerDoneFunction)
{
	instance.register(cors /* { origin: '*' } */);

	instance.register(fstatic, {
		root: path.join(__dirname, 'public'),
	});

	instance.register(async (instance, opts, done) => // eslint-disable-line no-shadow
	{
		instance.post('/m3u8', m3u8);

		done();
	}, { prefix: '/api' });

	done();
}
