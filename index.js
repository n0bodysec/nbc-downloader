/* eslint-disable no-await-in-loop */

import axios from 'axios';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import prompt from 'prompt';
import sanitize from 'sanitize-filename';
import { program } from 'commander';
import { parseString } from 'xml2js';
import { spawn } from 'child_process';
import NBC from './src/api/index.js';
import apiConstants from './src/api/utils/constants.js';
import logger from './src/utils/logger.js';
import CustomError from './src/utils/custom-error.js';
import * as utils from './src/utils/functions.js';

async function parse(url, _, command)
{
	const re = new RegExp('^(https?:\/\/)?(www\.)?nbc\.com\/[A-Za-z0-9-]+\/video\/[A-Za-z0-9-]+\/[0-9]+$'); // eslint-disable-line
	if (!re.test(url))
	{
		const err = 'The entered URL is not from an nbc.com video. It should be something like: https://www.nbc.com/<show>/video/<name>/<id>';
		if (!command) throw new CustomError('InvalidURLError', err);
		logger(err, 'error');
		return 1;
	}

	const res = await axios.get(url);
	if (res.status !== 200)
	{
		const err = `Axios returned HTTP Status ${res.status}`;
		if (!command) throw new CustomError('AxiosStatusError', err);
		logger(err, 'error');
		return 1;
	}

	const htmlTitle = res.data.match(/<title.*?>Watch (.*) - NBC.com<\/title>/)[1];
	const mpxGuid = res.data.match(/"mpxGuid":"([0-9]+)"/)[1];
	const mpxAccountId = res.data.match(/"mpxAccountId":"([0-9]+)"/)[1];

	if (!command) return { mpxAccountId, mpxGuid };

	logger(`${htmlTitle} : mpxAccountId: ${mpxAccountId} | mpxGuid: ${mpxGuid}`);
	logger(`Command: ${command.parent.name()} download ${mpxAccountId} ${mpxGuid}`);

	return 0;
}

async function download(mpxAccountId, mpxGuid, options)
{
	const nbc = new NBC();
	const mpxGuidSplit = mpxGuid.split(',').filter((x) => x);
	let episodeCount = apiConstants.FREE_CREDITS;

	if (mpxGuidSplit.length > 1)
	{
		logger('Multiple \'mpxGuid\' were found, all movies will be downloaded. However, this is NOT recommended.', 'warn');

		if (options.output !== undefined)
		{
			logger('The option \'--output\' cannot be used with multiple \'mpxGuid\', the default value will be used.', 'warn');
			options.output = undefined;
		}

		if (options.convert !== undefined)
		{
			logger('The option \'--convert\' cannot be used with multiple \'mpxGuid\', the file will be converted inside a temporary system folder.', 'warn');
		}
	}

	for (const currMpxGuid of mpxGuidSplit) // eslint-disable-line no-restricted-syntax
	{
		mpxGuid = currMpxGuid;

		if (options.premium !== undefined && (options.username === undefined || options.password === undefined)) { logger('The options \'--username\' and \'--password\' must be set if \'--premium\' is set.', 'error'); return 1; }
		if (options.premium !== undefined && options.register !== undefined) { logger('The option \'--register\' must NOT be set if \'--premium\' is set.', 'error'); return 1; }

		if (options.register === undefined && (options.username === undefined || options.password === undefined)) { logger('The options \'--username\' and \'--password\' must be set if \'--register\' is not set.', 'error'); return 1; }

		if (options.username !== undefined && options.password === undefined) { logger('The option \'--password\' must be set if \'--username\' is set.', 'error'); return 1; }
		if (options.username === undefined && options.password !== undefined) { logger('The option \'--username\' must be set if \'--password\' is set.', 'error'); return 1; }

		if (options.register !== undefined && (options.username === undefined || options.password === undefined))
		{
			const creds = utils.genCredentials();
			options.username = creds.username;
			options.password = creds.password;

			logger(`Generated random credentials: ${options.username}, ${options.password}`, 'warn');
		}

		if (mpxGuidSplit.length > 1) logger(`The value ${currMpxGuid} was set for mpxGuid.`, 'warn');

		if (options.register !== undefined)
		{
			const register = await nbc.account.registerSimple(options.username, options.password);
			logger(`Account creation returned: ${register.data.result.code} - ${register.data.result.description}`, register.data.result.code === 200 ? 'info' : 'warn');
			// if (register.data.result.code !== 200) return 1;
		}
		else
		{
			nbc.username = options.username;
			nbc.password = options.password;
		}

		const session = await nbc.account.getSession();
		logger(`Session returned: ${session.data.result.code} - ${session.data.result.description}`, session.data.result.code === 200 ? 'info' : 'error');
		if (session.data.result.code !== 200) return 1;
		if (options.verbose >= 1) logger(`Obtained tokenId for user ${options.username}`);

		const link = await nbc.stream.getLink(mpxGuid, mpxAccountId).catch((e) =>
		{
			logger(`Failed to get link: ${e.response.data.errorCode} - ${e.response.data.message} - ${e.response.data.description}`, 'error');
			process.exit(1); // return 1;
		});

		if (options.verbose >= 1) logger(`Obtained stream link: ${link.data.url}`);

		const smil = await nbc.stream.getSmilHls(link.data.url);

		if (smil.data.indexOf('link.theplatform.com/s/errorFiles/Unavailable.mp4') !== -1)
		{
			if (options.verbose < 3)
			{
				logger('Something went wrong trying to read the XML file. For more information, try again with \'-vvv\'', 'error');
				parseString(smil.data, (err, res) =>
				{
					const errorInfo = res.smil.body[0].seq[0].ref[0];
					logger(`Smil returned: ${errorInfo.$.title} - ${errorInfo.$.abstract}`, 'error');
				});
			}
			else
			{
				logger('Something went wrong trying to read the XML file.', 'error');
				console.log(smil);
			}
			return 1;
		}

		let videos = null; // best: videos[0].$.src
		let videosRef = null;

		parseString(smil.data, (err, res) =>
		{
			videos = res.smil.body[0].seq[0].par[0].switch[0].video;
			videosRef = res.smil.body[0].seq[0].par[0].switch[0].ref[0];
		});

		const videoInfo = {
			title: videosRef.$.title,
			show: videosRef.param.filter((x) => x.$.name === 'show')[0].$.value,
			programmingType: videosRef.param.filter((x) => x.$.name === 'programmingType')[0].$.value,
			fullEpisode: videosRef.param.filter((x) => x.$.name === 'fullEpisode')[0].$.value,
			seasonNumber: videosRef.param.filter((x) => x.$.name === 'seasonNumber')[0].$.value,
			episodeNumber: undefined,
			type: null,
		};

		videoInfo.type = utils.getVideoType(videoInfo.programmingType, videoInfo.fullEpisode);
		if (videoInfo.type !== 'Clip') videoInfo.episodeNumber = videosRef.param.filter((x) => x.$.name === 'episodeNumber')[0].$.value;

		const outFilename = sanitize(videoInfo.type === 'Show' ? `${videoInfo.show} - S${videoInfo.seasonNumber}E${videoInfo.episodeNumber} - ${videoInfo.title}` : videoInfo.title);

		if (options.verbose >= 1) logger(`Fetched information: [${videoInfo.type}] ${videoInfo.type === 'Show' ? `${videoInfo.show}: S${videoInfo.seasonNumber}E${videoInfo.episodeNumber} - ${videoInfo.title}` : videoInfo.title}`);
		if (options.verbose > 1) logger('Obtained a list of video resolutions');

		let idx = 0;
		videos.forEach((x) =>
		{
			idx++;
			if (!options.batch) logger(`${idx}. ${x.$.width}x${x.$.height}`);
		});

		let selectedRes = 1;
		if (options.batch)
		{
			logger('The \'--batch\' option is present, the resolution was selected automatically', 'warn');
			// selectedRes = 1;
		}
		else
		{
			prompt.start();
			const { resolution } = await prompt.get({
				name: 'resolution',
				description: 'Enter a resolution number',
				type: 'integer',
				minimum: 1,
				maximum: idx,
				message: `The input value must be a valid integer between 1 and ${idx}`,
				required: true,
			});

			selectedRes = resolution;
		}

		const selectedVideo = videos[selectedRes - 1];
		logger(`Selected resolution: ${selectedVideo.$.width}x${selectedVideo.$.height}`);

		const baseUrl = selectedVideo.$.src.replace('master_hls.m3u8', '');
		if (options.verbose >= 1) logger(`Stream base url: ${baseUrl}`);

		const masterHls = await axios.get(selectedVideo.$.src);
		const playlistFile = nbc.utils.getLineContainingStr(masterHls.data, selectedVideo.$.height + '_hls');
		if (options.verbose >= 1) logger(`Playlist file: ${playlistFile}`);

		const m3u8 = await axios.get(baseUrl + playlistFile);
		const parsedRet = m3u8.data.replaceAll(/^(.*\.ts)$/gm, baseUrl + playlistFile.split('/')[0] + '/$1');
		if (options.verbose >= 1) logger('Playlist file crafted');

		let outputPath;
		if (options.output === undefined)
		{
			const tmpDir = path.join(os.tmpdir(), 'nbc-downloader');
			const filename = path.join(tmpDir, `${outFilename}.m3u8`);

			utils.ensureDir(tmpDir);

			await fs.writeFile(filename, parsedRet);
			logger(`Successfully created m3u8 file on: ${filename}`);
			outputPath = filename;
		}
		else
		{
			await fs.writeFile(options.output, parsedRet);
			logger(`Successfully created m3u8 file on: ${options.output}`);
			outputPath = options.output;
		}

		if (options.convert !== undefined)
		{
			const ffmpegPath = await nbc.utils.findExecutable('ffmpeg');
			if (ffmpegPath === null && options.ffmpeg === undefined)
			{
				logger('The option \'--ffmpeg\' must be set to a valid ffmpeg path', 'error');
				return 1;
			}

			do
			{
				await nbc.utils.timeout(100);
			}
			while (outputPath === undefined);

			if (mpxGuidSplit.length > 1) // multiple mpxGuid
			{
				const tmpDir = path.join(os.tmpdir(), 'nbc-downloader');
				const filename = path.join(tmpDir, `${outFilename}.mp4`);

				utils.ensureDir(tmpDir);
				options.convert = filename;

				logger('Multiple \'mpxGuid\' detected. The .mp4 output path will be ' + options.convert, 'warn');
			}

			const ffmpeg = spawn(options.ffmpeg === undefined ? ffmpegPath : options.ffmpeg, ['-protocol_whitelist', 'file,http,https,tcp,tls,crypto', '-i', outputPath, '-c', 'copy', options.convert, '-y']);

			if (options.verbose < 2)
			{
				logger('FFmpeg output will not be displayed because the verbosity level is lower than 2', 'warn');
				logger('Please wait for the task to finish', 'warn');
			}

			ffmpeg.stdout.on('data', (data) => { if (options.verbose >= 2) console.log(data.toString()); });
			ffmpeg.stderr.on('data', (data) => { if (options.verbose >= 2) console.log(data.toString()); });
			ffmpeg.on('message', (message) => { if (options.verbose >= 2) console.log(message); });

			ffmpeg.on('exit', (code) =>
			{
				if (code === 0) logger(`All tasks done! Please check ${options.convert} for the output file`);
				logger('FFmpeg exited with code ' + code, 'warn');
			});
		}

		if (options.premium === undefined)
		{
			const profile = await nbc.account.getProfile();
			if (profile.data.result.code !== 200)
			{
				logger(`Profile returned: ${session.data.result.code} - ${session.data.result.description}`, 'warn');
				episodeCount--; // TODO: check if the current mpxGuid is premium
			}
			else episodeCount = profile.data.profile.episodeCount;

			if (episodeCount === 0) // TODO: check if episodeCount is NOT zero on premium accounts
			{
				if (options.register) logger(`Free credits limit (${apiConstants.FREE_CREDITS}) reached! A new account will be generated in the next iteration.`, 'warn');
				else
				{
					logger(`Free credits limit (${apiConstants.FREE_CREDITS}) reached! Exiting...`, 'warn');
					return 1;
				}

				episodeCount = apiConstants.FREE_CREDITS;
				options.username = undefined;
				options.password = undefined;
			}
		}

		if (mpxGuidSplit.length > 1) console.log('\n\n\n');
	}

	return 0;
}

function addDownloadOptions(command)
{
	command
		.option('-u, --username <email>', 'account email address')
		.option('-p, --password <password', 'account password')
		.option('-r, --register', 'register a new account instead of login with the specified credentials (optional)')
		.option('-t, --premium', 'assume that the specified account is premium to avoid some checks and gain some speed (optional)') // -t means TV Provider (-p is already used for --password)
		.option('-o, --output <filename>', 'output filename (optional)')
		.option('-c, --convert <filename>', 'convert m3u8 file to mp4 using ffmpeg (optional)')
		.option('-f, --ffmpeg <path>', 'ffmpeg path (optional)')
		.option('-b, --batch', 'never ask for user input, use the default behaviour (optional)')
		.option('-v, --verbose', 'display extended logging information', ((dummyValue, previous) => previous + 1), 0);
}

(async () =>
{
	program
		.name('nbc-downloader')
		.description('nbc.com downloader from cli')
		.version('1.0.0');

	program.command('parse')
		.description('get mpxGuid and mpxAccountId from the given nbc.com url')
		.argument('<url>', 'a valid url from nbc (something like: https://www.nbc.com/<show>/video/<name>/<id>)')
		.action(parse);

	const dOpt = program.command('download')
		.description('download an ad-free & region-free .m3u8 file with the possibility to convert it with ffmpeg')
		.argument('<mpxAccountId>', 'the mpxAccountId number')
		.argument('<mpxGuid>', 'the mpxGuid number')
		.action(download);

	const parseDownload = program.command('url')
		.description('same as "download" but using an url instead')
		.argument('<url>', 'a valid url from nbc (something like: https://www.nbc.com/<show>/video/<name>/<id>)')
		.action(async (url, options) =>
		{
			try
			{
				const ret = await parse(url);
				return download(ret.mpxAccountId, ret.mpxGuid, options);
			}
			catch (e)
			{
				if (e.name === 'InvalidURLError' || e.name === 'AxiosStatusError')
				{
					logger(e.message, 'error');
					return 1;
				}

				throw e;
			}
		});

	addDownloadOptions(dOpt);
	addDownloadOptions(parseDownload);

	program.parse(process.argv);
})();
