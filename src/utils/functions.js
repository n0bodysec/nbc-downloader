import fs from 'fs';
import { randomBytes } from 'crypto';

export const ensureDir = (dir) =>
{
	try
	{
		return fs.mkdirSync(dir);
	}
	catch (e)
	{
		if (e.code !== 'EEXIST') throw e;
	}

	return null;
};

export const getVideoType = (programmingType, fullEpisode) =>
{
	if (programmingType === undefined || fullEpisode === undefined) return 'Unknown';
	if (programmingType === 'Movie') return 'Movie';
	if (programmingType === 'Full Episode' && fullEpisode === 'true') return 'Show';

	return 'Clip';
};

export const genCredentials = () =>
{
	return {
		username: randomBytes(8).toString('hex') + '@gmail.com',
		password: 'P4ss@' + randomBytes(5).toString('hex'),
	};
};
