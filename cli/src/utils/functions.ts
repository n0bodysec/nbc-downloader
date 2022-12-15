import { cyanBright, gray, magenta, redBright } from 'colorette';
import { randomBytes } from 'crypto';
import { mkdir } from 'fs/promises';

export function logger(message: string, type?: ('fatal' | 'error' | 'warn' | 'info' | 'debug'))
{
	switch (type)
	{
		case 'fatal': {
			console.log(magenta(message));
			break;
		}

		case 'error': {
			console.log(redBright(message));
			break;
		}

		case 'info': {
			console.log(cyanBright(message));
			break;
		}

		case 'debug': {
			console.log(gray(message));
			break;
		}

		default: {
			console.log(message);
		}
	}
}

export const genCredentials = () => ({
	username: randomBytes(8).toString('hex') + '@gmail.com',
	password: 'P4ss@' + randomBytes(5).toString('hex'),
});

export const getVideoType = (programmingType: string, fullEpisode: string) =>
{
	if (!programmingType || !fullEpisode) return 'Unknown';
	if (programmingType === 'Movie') return 'Movie';
	if (programmingType === 'Full Episode' && fullEpisode === 'true') return 'Show';

	return 'Clip';
};

export const ensureDir = async (dir: string) =>
{
	try
	{
		return await mkdir(dir);
	}
	catch (e: any)
	{
		if (e.code !== 'EEXIST') throw e;
	}

	return null;
};
