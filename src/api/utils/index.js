import fs from 'fs/promises';
import path from 'path';

class utils
{
	constructor (base)
	{
		this.encodePassword = (password = base.password) =>
		{
			if (password == null) throw new Error('password cannot be null nor undefined');

			const prefix = '=?UTF-8?B?';
			const suffix = '?=';
			const encoded = Buffer.from(password).toString('base64');
			return prefix.concat(encoded, suffix);
		};

		this.getLineContainingStr = (data, str) =>
		{
			const lines = data.split('\n');
			for (let i = 0; i < lines.length; i++)
			{
				if (lines[i].indexOf(str) !== -1) return lines[i];
			}

			return null;
		};

		this.timeout = async (delayms) =>
		{
			return new Promise((resolve) => { setTimeout(resolve, delayms); });
		};

		this.findExecutable = async (exe) =>
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
	}
}

export default utils;
