import { API as NBC } from '@n0bodysec/nbc-api';
import { Stream } from '@n0bodysec/nbc-api/lib/endpoints/stream';
import axios from 'axios';
import { FastifyReply, FastifyRequest } from 'fastify';
import m3u8Parser from 'm3u8-parser';
import { parseString } from 'xml2js';
import { getVideoType, sendMessage } from '../utils/functions';

type xmilObject = Record<string, any>;

interface BodyType
{
	apiPassword: string;
	email: string;
	password: string;
	mpxAccountId: number;
	mpxGuid: number;
}

// TODO: split requests in multiple routes
const post = async (req: FastifyRequest<{ Body: BodyType; }>, res: FastifyReply) =>
{
	if (!req || !req.body) return sendMessage(res, 200, 400, 'Invalid body');
	if (req.body.apiPassword !== process.env.API_PASSWORD) return sendMessage(res, 200, 401, 'Invalid API password');
	if (!req.body.email) return sendMessage(res, 200, 400, 'No email provided');
	if (!req.body.password) return sendMessage(res, 200, 400, 'No password provided');
	if (!req.body.mpxAccountId) return sendMessage(res, 200, 400, 'No mpxAccountId provided');
	if (!req.body.mpxGuid) return sendMessage(res, 200, 400, 'No mpxGuid provided');

	const proxy = process.env.MINIPROXY ?? '';

	try
	{
		const nbc = new NBC();

		// 1. register a new account
		const register = await nbc.account.registerSimple(req.body.email, req.body.password);
		const outAccMsg = `Account creation returned: ${register.data.result.code} - ${register.data.result.description}`;
		// if (register.data.result.code !== 200) return sendMessage(res, register.status, 400, outAccMsg);

		// 2. login/get session token
		const session = await nbc.account.getSession();
		const outSessMsg = `Session returned: ${session.data.result.code} - ${session.data.result.description}`;
		if (session.data.result.code !== 200) return sendMessage(res, session.status, 400, outSessMsg);

		// 3. get stream link
		const link = await nbc.stream.getLink(req.body.mpxGuid, req.body.mpxAccountId).catch((e) => sendMessage(res, 200, 400, `Failed to get link: ${e.response.data.errorCode} - ${e.response.data.message} - ${e.response.data.description}`));

		// 4. get smil
		const smil = await Stream.getSmilHls(proxy + link.data.url);

		if (smil.data.indexOf('link.theplatform.com/s/errorFiles/Unavailable.mp4') !== -1)
		{
			let error = null;

			parseString(smil.data, (err, response) =>
			{
				const errorInfo = response.smil.body[0].seq[0].ref[0];
				error = `Smil returned: ${errorInfo.$.title} - ${errorInfo.$.abstract}`;
			});

			return sendMessage(res, 200, 400, error ?? '');
		}

		// 5. parse video info
		let videos: Record<any, any>[] = []; // best: videos[0].$.src
		let videosRef: xmilObject = {};

		parseString(smil.data, (err, response) =>
		{
			videos = response.smil.body[0].seq[0].par[0].switch[0].video;
			videosRef = response.smil.body[0].seq[0].par[0].switch[0].ref[0];
		});

		const videoInfo = {
			title: videosRef.$.title,
			show: videosRef.param.filter((x: xmilObject) => x.$.name === 'show')[0].$.value,
			programmingType: videosRef.param.filter((x: xmilObject) => x.$.name === 'programmingType')[0].$.value,
			fullEpisode: videosRef.param.filter((x: xmilObject) => x.$.name === 'fullEpisode')[0].$.value,
			seasonNumber: videosRef.param.filter((x: xmilObject) => x.$.name === 'seasonNumber')[0].$.value,
			episodeNumber: '',
			type: '',
		};

		videoInfo.type = getVideoType(videoInfo.programmingType, videoInfo.fullEpisode);
		if (videoInfo.type !== 'Clip') videoInfo.episodeNumber = videosRef.param.filter((x: xmilObject) => x.$.name === 'episodeNumber')[0].$.value;

		const outFilename = videoInfo.type === 'Show' ? `${videoInfo.show} - S${videoInfo.seasonNumber}E${videoInfo.episodeNumber} - ${videoInfo.title}` : videoInfo.title;
		// const outInfo = `[${videoInfo.type}] ${videoInfo.type === 'Show' ? `${videoInfo.show}: S${videoInfo.seasonNumber}E${videoInfo.episodeNumber} - ${videoInfo.title}` : videoInfo.title}`;

		const selectedVideo = videos[0]!;
		const outRes = `${selectedVideo.$.width}x${selectedVideo.$.height}`;

		// 6. parse m3u8
		const baseUrl = selectedVideo.$.src.replace('master_hls.m3u8', '');

		const masterHls = await axios.get(proxy + selectedVideo.$.src);

		const parser = new m3u8Parser.Parser();
		parser.push(masterHls.data);
		parser.end();

		const playlist = parser.manifest.playlists.find((x: xmilObject) => x.attributes.RESOLUTION.width == selectedVideo.$.width && x.attributes.RESOLUTION.height == selectedVideo.$.height); // eslint-disable-line eqeqeq

		let parsedRet = null;

		// 7. fix m3u8 ts files
		const re = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;
		if (re.test(playlist.uri))
		{
			const split = playlist.uri.split('/');
			const m3u8 = await axios.get(proxy + playlist.uri);
			parsedRet = m3u8.data.replaceAll(/^(.*\.ts)$/gm, proxy + playlist.uri.replace(split[split.length - 1], '') + '$1');
		}
		else
		{
			const m3u8 = await axios.get(proxy + baseUrl + playlist.uri);
			parsedRet = m3u8.data.replaceAll(/^(.*\.ts)$/gm, proxy + baseUrl + playlist.uri.split('/')[0] + '/$1');
		}

		// 8. return all information
		return res.send({
			status: 200,
			code: 200,
			registerMessage: outAccMsg,
			loginMessage: outSessMsg,
			filename: outFilename,
			videoInfo,
			resolution: outRes,
			stream_url: baseUrl,
			playlist: playlist.uri,
			m3u8: parsedRet,
		});
	}
	catch (e)
	{
		console.error(e);
		return sendMessage(res, 200, 400, 'Not available', JSON.stringify(e));
	}
};

export default post;
