/* eslint-disable no-await-in-loop */

import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import prompt from 'prompt';
import { randomBytes } from 'crypto';
import { program } from 'commander';
import { parseString } from 'xml2js';
import { spawn } from 'child_process';
import NBC from './src/api/index.js';
import apiConstants from './src/api/utils/constants.js';
import logger from './src/utils/logger.js';
import { printError, ensureDir } from './src/utils/functions.js';

//! If you send 6 getSession() with invalid password, the account will be LOCKED

(async () =>
{
	try
	{
		program
			.name('nbc-downloader')
			.description('nbc.com downloader from cli')
			.version('1.0.0');

		/* program.configureHelp({
			argumentDescription: (arg) => arg.description.charAt(0).toLowerCase() + arg.description.slice(1),
			optionDescription: (option) => option.description.charAt(0).toLowerCase() + option.description.slice(1),
			subcommandDescription: (cmd) => cmd.description().charAt(0).toLowerCase() + cmd.description().slice(1),
			// commandDescription: (cmd) => cmd.description().charAt(0).toLowerCase() + cmd.description().slice(1),
		}); */

		program.command('parse')
			.description('get mpxGuid and mpxAccountId from the given nbc.com url')
			.argument('<url>', 'nbc.com url to parse')
			.action(async (url, _, command) =>
			{
				try
				{
					const re = new RegExp('^(https?:\/\/)?(www\.)?nbc\.com\/[A-Za-z0-9-]+\/video\/[A-Za-z0-9-]+\/[0-9]+$'); // eslint-disable-line
					if (!re.test(url))
					{
						logger('The entered URL is not from an nbc.com video. It should be something like: https://www.nbc.com/<show>/video/<name>/<id>', 'error');
						return 1;
					}

					const res = await axios.get(url);
					if (res.status !== 200)
					{
						logger(`Axios returned HTTP Status ${res.status}`, 'error');
						return 1;
					}

					const htmlTitle = res.data.match(/<title.*?>Watch (.*) - NBC.com<\/title>/)[1];
					const mpxGuid = res.data.match(/"mpxGuid":"([0-9]+)"/)[1];
					const mpxAccountId = res.data.match(/"mpxAccountId":"([0-9]+)"/)[1];

					logger(`${htmlTitle} : mpxAccountId: ${mpxAccountId} | mpxGuid: ${mpxGuid}`);
					logger(`Command: ${command.parent.name()} download ${mpxAccountId} ${mpxGuid}`);
				}
				catch (e)
				{
					printError(e);
					process.exit(1);
				}

				return 0;
			});

		program.command('download')
			.description('download an ad-free & region-free .m3u8 file with the possibility to convert it with ffmpeg')
			.argument('<mpxAccountId>', 'the mpxAccountId number')
			.argument('<mpxGuid>', 'the mpxGuid number')
			.option('-u, --username <email>', 'account email address (an account will be created if it does not exist)')
			.option('-p, --password <password', 'account password (an account will be created if it does not exist)')
			.option('-o, --output <filename>', 'output filename (optional)')
			.option('-c, --convert <filename>', 'convert m3u8 file to mp4 using ffmpeg (optional)')
			.option('-f, --ffmpeg <path>', 'ffmpeg path (optional)')
			.option('-b, --batch', 'never ask for user input, use the default behaviour (optional)')
			.option('-v, --verbose', 'display extended logging information', ((dummyValue, previous) => previous + 1), 0)
			.action(async (mpxAccountId, mpxGuid, options) =>
			{
				try
				{
					const nbc = new NBC();
					const mpxGuidSplit = mpxGuid.split(',').filter((x) => x);
					let generatedRandomCreds = 0;

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
						if (mpxGuidSplit.length > 1)
						{
							logger('Processing a new mpxGuid...', 'warn');
							logger(`The value ${currMpxGuid} was set for mpxGuid.`, 'warn');
						}

						if (options.username !== undefined && options.password === undefined) { logger('The option \'--password\' must be set if \'--username\' is set.', 'error'); return 1; }
						if (options.username === undefined && options.password !== undefined) { logger('The option \'--username\' must be set if \'--password\' is set.', 'error'); return 1; }
						if (options.username === undefined || options.password === undefined)
						{
							generatedRandomCreds++;

							options.username = randomBytes(8).toString('hex') + '@gmail.com';
							logger('Username is not defined. A randomly generated value will be used: ' + options.username, 'warn');

							options.password = 'P4ss@' + randomBytes(5).toString('hex');
							logger('Password is not defined. A randomly generated value will be used: ' + options.password, 'warn');
						}

						const register = await nbc.account.registerSimple(options.username, options.password);
						logger(`Account creation returned: ${register.data.result.code} - ${register.data.result.description}`, register.data.result.code === 200 ? 'info' : 'warn');
						// if (register.data.result.code !== 200) return 1;

						const session = await nbc.account.getSession(options.username, options.password);
						logger(`Session returned: ${session.data.result.code} - ${session.data.result.description}`, session.data.result.code === 200 ? 'info' : 'error');
						if (session.data.result.code !== 200) return 1;
						logger(`Obtained tokenId for user ${options.username}`);

						const link = await nbc.stream.getLink(mpxGuid, mpxAccountId, session.data.session.tokenId).catch((e) =>
						{
							logger(`Failed to get link: ${e.response.data.errorCode} - ${e.response.data.message} - ${e.response.data.description}`, 'error');
							process.exit(1);
						});
						logger(`Obtained stream link for guid=${mpxGuid},account=${mpxAccountId}: ${link.data.url}`);

						const smil = await nbc.stream.getSmilHls(link.data.url);

						if (smil.data.indexOf('link.theplatform.com/s/errorFiles/Unavailable.mp4') !== -1)
						{
							if (options.verbose < 2)
							{
								logger('Something went wrong trying to read the XML file. For more information, try again with \'-vv\'', 'error');
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

						logger(`Fetched information: ${videosRef.param.filter((x) => x.$.name === 'show')[0].$.value} - ${videosRef.$.title}`);
						logger('Obtained a list of video resolutions');

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
						logger(`Stream base url: ${baseUrl}`);

						const masterHls = await axios.get(selectedVideo.$.src);
						const playlistFile = nbc.utils.getLineContainingStr(masterHls.data, selectedVideo.$.height + '_hls');
						logger(`Playlist file: ${playlistFile}`);

						const m3u8 = await axios.get(baseUrl + playlistFile);
						const parsedRet = m3u8.data.replaceAll(/^(.*\.ts)$/gm, baseUrl + playlistFile.split('/')[0] + '/$1');
						logger('Playlist file (m3u8) retrieved and parsed');

						let outputPath;
						if (options.output === undefined)
						{
							const tmpDir = path.join(os.tmpdir(), 'nbc-downloader');
							const filename = path.join(tmpDir, `${mpxAccountId}-${mpxGuid}.m3u8`);

							ensureDir(tmpDir);

							fs.appendFile(filename, parsedRet, (e) => { if (e) throw e; });
							logger(`Successfully created m3u8 file on: ${filename}`);
							outputPath = filename;
						}
						else
						{
							fs.appendFile(options.output, parsedRet, (e) => { if (e) throw e; });
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
								const filename = path.join(tmpDir, `${mpxAccountId}-${mpxGuid}.mp4`);

								ensureDir(tmpDir);
								options.convert = filename;

								logger('Multiple \'mpxGuid\' detected. The .mp4 output path will be ' + options.convert, 'warn');
							}

							const ffmpeg = spawn(options.ffmpeg === undefined ? ffmpegPath : options.ffmpeg, ['-protocol_whitelist', 'file,http,https,tcp,tls,crypto', '-i', outputPath, '-c', 'copy', options.convert, '-y']);

							if (options.verbose >= 1) // TODO: fix ffmpeg not finishing without verbose
							{
								ffmpeg.stdout.on('data', (data) => console.log(data.toString()));
								ffmpeg.stderr.on('data', (data) => console.log(data.toString()));
							}
							else
							{
								logger('FFmpeg output will not be displayed because the verbosity level is lower than 1', 'warn');
								logger('Please wait for the task to finish', 'warn');
							}

							ffmpeg.on('message', (message) => console.log(message));

							ffmpeg.on('exit', (code) =>
							{
								if (code === 0) logger(`All tasks done! Please check ${options.convert} for the output file`);
								logger('FFmpeg exited with code ' + code, 'warn');
							});
						}

						if (generatedRandomCreds > 0)
						{
							if (generatedRandomCreds === apiConstants.FREE_CREDITS)
							{
								logger(`Free credits limit (${apiConstants.FREE_CREDITS}) reached! A new account will be generated in the next iteration.`, 'warn');
								generatedRandomCreds = 0;
							}

							options.username = undefined;
							options.password = undefined;
						}

						if (mpxGuidSplit.length > 1) console.log('\n\n\n');
					}
				}
				catch (e)
				{
					printError(e);
					process.exit(1);
				}

				return 0;
			});

		program.parse(process.argv);
	}
	catch (e)
	{
		printError(e);
		process.exit(1);
	}
})();
