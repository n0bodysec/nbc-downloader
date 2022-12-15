import { API as NBC } from '@n0bodysec/nbc-api';
import { Stream } from '@n0bodysec/nbc-api/lib/endpoints/stream';
import axios, { AxiosError } from 'axios';
import { writeFile } from 'fs/promises';
// @ts-expect-error
import * as m3u8Parser from 'm3u8-parser';
import { tmpdir } from 'os';
import { join } from 'path';
import prompts, { Choice } from 'prompts';
import sanitize from 'sanitize-filename';
import { parseString } from 'xml2js';
import { ensureDir, genCredentials, getVideoType, logger } from '../utils/functions';
import { commanderOptions, HackyAny, smilData, switchRef, videoAny } from '../utils/types';
import { parse } from './parse';

function checkOptions(options: commanderOptions)
{
	if (!options.register && (!options.username || !options.password))
	{
		logger('Options --username and --password must be set if --register is not set', 'error');
		return 1;
	}

	if (options.username && !options.password)
	{
		logger('You MUST specify a --password if you specify an --username', 'error');
		return 1;
	}

	if (options.password && !options.username)
	{
		logger('You MUST specify an --username if you specify a --password', 'error');
		return 1;
	}

	return 0;
}

export async function download(url: string, options: commanderOptions)
{
	const ok = checkOptions(options);
	if (ok !== 0) process.exit(ok);

	if (!options.proxy) options.proxy = '';

	const nbc = new NBC();
	const { mpxGuid, mpxAccountId } = await parse(url);

	// register
	if (options.register)
	{
		const creds = genCredentials();
		options.username = creds.username;
		options.password = creds.password;

		logger(`Generated random credentials: ${options.username}, ${options.password}`, 'info');

		const register = await nbc.account.registerSimple(options.username, options.password);
		logger(`Account creation returned: ${register.data.result.code} - ${register.data.result.description}`, register.data.result.code === 200 ? 'info' : 'warn');
		// if (register.data.result.code !== 200) process.exit(1);
	}
	else if (options.username !== undefined && options.password !== undefined)
	{
		nbc.username = options.username;
		nbc.password = options.password;
	}

	// login
	const session = await nbc.account.getSession();
	logger(`Session returned: ${session.data.result.code} - ${session.data.result.description}`, session.data.result.code === 200 ? 'info' : 'error');
	if (session.data.result.code !== 200) process.exit(1);
	if (options.verbose >= 1) logger(`Obtained tokenId for user ${options.username}`, 'debug');

	// get stream link
	const link = await nbc.stream.getLink(mpxGuid, mpxAccountId).catch((e: AxiosError<HackyAny, HackyAny>) =>
	{
		logger(`Failed to get link: ${e.response?.data.errorCode} - ${e.response?.data.message} - ${e.response?.data.description}`, 'error');
		process.exit(1);
	});

	if (options.verbose >= 1) logger(`Obtained stream link: ${link.data.url}`, 'debug');

	// get smil
	const smil = await Stream.getSmilHls(options.proxy + link.data.url);

	if (smil.data.indexOf('link.theplatform.com/s/errorFiles/Unavailable.mp4') !== -1)
	{
		if (options.verbose < 3)
		{
			logger('Something went wrong trying to read the XML file. For more information, try again with \'-vvv\'', 'error');
			parseString(smil.data, (err: Error | null, res: smilData) =>
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

		process.exit(1);
	}

	// process video info
	let videos: Record<HackyAny, HackyAny>[] = []; // best: videos[0].$.src
	let videosRef: switchRef;

	parseString(smil.data, (err: Error | null, res: smilData) =>
	{
		videos = res.smil.body[0].seq[0].par[0].switch[0].video;
		videosRef = res.smil.body[0].seq[0].par[0].switch[0].ref[0];
	});

	const videoInfo = {
		title: videosRef.$.title,
		show: videosRef.param.filter((x: videoAny) => x.$.name === 'show')[0].$.value,
		programmingType: videosRef.param.filter((x: videoAny) => x.$.name === 'programmingType')[0].$.value,
		fullEpisode: videosRef.param.filter((x: videoAny) => x.$.name === 'fullEpisode')[0].$.value,
		seasonNumber: videosRef.param.filter((x: videoAny) => x.$.name === 'seasonNumber')[0].$.value,
		episodeNumber: '',
		type: '',
	};

	videoInfo.type = getVideoType(videoInfo.programmingType, videoInfo.fullEpisode);
	if (videoInfo.type !== 'Clip') videoInfo.episodeNumber = videosRef.param.filter((x: videoAny) => x.$.name === 'episodeNumber')[0].$.value;

	const outFilename = sanitize(videoInfo.type === 'Show' ? `${videoInfo.show} - S${videoInfo.seasonNumber}E${videoInfo.episodeNumber} - ${videoInfo.title}` : videoInfo.title);

	if (options.verbose >= 1) logger(`Fetched information: [${videoInfo.type}] ${videoInfo.type === 'Show' ? `${videoInfo.show}: S${videoInfo.seasonNumber}E${videoInfo.episodeNumber} - ${videoInfo.title}` : videoInfo.title}`, 'debug');

	// video resolutions
	if (options.verbose > 1) logger('Obtained a list of video resolutions', 'debug');

	let idx = 0;
	let selectedRes = 1;
	if (options.batch)
	{
		logger('The \'--batch\' option is present, the resolution was selected automatically', 'warn');
		// selectedRes = 1;
	}
	else
	{
		const resolution = (await prompts({
			type: 'select',
			name: 'value',
			message: 'Select a resolution',
			choices: () =>
			{
				const obj: Choice[] = [];
				videos.forEach((x) =>
				{
					idx++;
					obj.push({
						title: `${x.$.width}x${x.$.height}`,
						value: idx,
					});
				});

				return obj;
			},
		})).value;

		selectedRes = resolution;
	}

	const selectedVideo = videos[selectedRes - 1]!;
	logger(`Selected resolution: ${selectedVideo.$.width}x${selectedVideo.$.height}`);

	// parse playlist
	const baseUrl = selectedVideo.$.src.replace('master_hls.m3u8', '');
	if (options.verbose >= 1) logger(`Stream base url: ${baseUrl}`);

	const masterHls = await axios.get(options.proxy + selectedVideo.$.src);

	const parser = new m3u8Parser.Parser();
	parser.push(masterHls.data);
	parser.end();

	const playlist = parser.manifest.playlists.find((x: any) => x.attributes.RESOLUTION.width == selectedVideo.$.width && x.attributes.RESOLUTION.height == selectedVideo.$.height); // eslint-disable-line eqeqeq
	if (options.verbose >= 1) logger(`Playlist: ${playlist.uri}`);

	let parsedRet = null;

	const re = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;
	if (re.test(playlist.uri))
	{
		const split = playlist.uri.split('/');
		const m3u8 = await axios.get(options.proxy + playlist.uri);
		parsedRet = m3u8.data.replaceAll(/^(.*\.ts)$/gm, options.proxy + playlist.uri.replace(split[split.length - 1], '') + '$1');
	}
	else
	{
		const m3u8 = await axios.get(options.proxy + baseUrl + playlist.uri);
		parsedRet = m3u8.data.replaceAll(/^(.*\.ts)$/gm, options.proxy + baseUrl + playlist.uri.split('/')[0] + '/$1');
	}

	if (options.verbose >= 1) logger('Playlist file crafted');

	// output
	if (!options.output)
	{
		const tmpDir = join(tmpdir(), 'nbc-downloader');
		const filename = join(tmpDir, `${outFilename}.m3u8`);

		await ensureDir(tmpDir);

		await writeFile(filename, parsedRet);
		logger(`Successfully created m3u8 file on: ${filename}`);
	}
	else
	{
		await writeFile(options.output, parsedRet);
		logger(`Successfully created m3u8 file on: ${options.output}`);
	}
}
