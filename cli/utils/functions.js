import fs from 'fs/promises';
import path from 'path';

import { randomBytes } from 'crypto';

export const ensureDir = async (dir) =>
{
	try
	{
		return await fs.mkdir(dir);
	}
	catch (e)
	{
		if (e.code !== 'EEXIST') throw e;
	}

	return null;
};

export const getLineContainingStr = (data, str) =>
{
	const lines = data.split('\n');
	for (let i = 0; i < lines.length; i++)
	{
		if (lines[i].indexOf(str) !== -1) return lines[i];
	}

	return null;
};

export const timeout = async (delayms) =>
{
	return new Promise((resolve) => { setTimeout(resolve, delayms); });
};

export const findExecutable = async (exe) =>
{
	async function checkFileExists(filePath)
	{
		if ((await fs.stat(filePath)).isFile())
		{
			return filePath;
		}
		throw new Error('Not a file');
	}

	const envPath = process.env.PATH || '';
	const envExt = process.env.PATHEXT || '';
	const pathDirs = envPath.replace(/["]+/g, '').split(path.delimiter).filter(Boolean);
	const extensions = envExt.split(';');
	const candidates = pathDirs.flatMap((d) => extensions.map((ext) => path.join(d, exe + ext)));
	try
	{
		return await Promise.any(candidates.map(checkFileExists));
	}
	catch (e)
	{
		return null;
	}
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
