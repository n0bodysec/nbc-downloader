import fs from 'fs';
import logger from './logger.js';

export const printError = (e) =>
{
	logger('CRITICAL ERROR - SOMETHING HAS GONE TERRIBLY WRONG', 'fatal');
	console.error(e);
};

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
