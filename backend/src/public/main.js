/* eslint-disable no-undef */

// TODO: add ffmpeg.wasm

const API_URL = `https://${window.location.host}/api/`;
let savedRet = null;
let b64 = null;

class CustomError extends Error
{
	constructor (name = 'CustomError', ...params)
	{
		super(...params);

		if (Error.captureStackTrace)
		{
			Error.captureStackTrace(this, CustomError);
		}

		this.name = name;
		this.date = new Date();
	}
}

const genRanHex = (size) => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join(''); // https://stackoverflow.com/questions/58325771/how-to-generate-random-hex-string-in-javascript

function blobToBase64(blob)
{
	return new Promise((resolve) =>
	{
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result);
		reader.readAsDataURL(blob);
	});
}

async function parse(url)
{
	try
	{
		const re = /^(https?:\/\/)?(www\.)?nbc\.com\/[A-Za-z0-9-]+\/video\/[A-Za-z0-9-]+\/[0-9]+$/;
		if (!re.test(url)) throw new CustomError('InvalidURLError', 'The entered URL is not from an nbc.com video. It should be something like: https://www.nbc.com/<show>/video/<name>/<id>');

		const res = await $.get(url);

		const title = res.match(/<title.*?>Watch (.*) - NBC.com<\/title>/)[1];
		const mpxGuid = res.match(/"mpxGuid":"([0-9]+)"/)[1];
		const mpxAccountId = res.match(/"mpxAccountId":"([0-9]+)"/)[1];

		return { title, mpxAccountId, mpxGuid };
	}
	catch (e)
	{
		throw new CustomError('UnexpectedError', e.message);
	}
}

$(document).ready(async () =>
{
	console.log('Ready!');

	$('#nbc_btn').on('click', async () =>
	{
		const loadingModal = Swal.fire({
			icon: 'info',
			title: 'Please wait...',
			html: 'Your request is being processed',
			color: '#e2e2e2',
			background: '#11161c',
			// timer: 2000,
			showConfirmButton: false,
		});

		const parsed = await parse($('#nbc_url').val()).catch((e) =>
		{
			Swal.fire({
				icon: 'error',
				title: 'Oops...',
				html: `The request could not be processed<br/>${e.message}`,
				color: '#e2e2e2',
				background: '#11161c',
			});
			return null;
		});

		if (!parsed)
		{
			console.log('Invalid parse response, returning null...');
			return null;
		}

		const ret = await $.ajax({
			url: API_URL + 'm3u8',
			type: 'POST',
			data: JSON.stringify({
				apiPassword: $('#api_password').val(),
				email: genRanHex(8) + '@gmail.com',
				password: 'P4ss@' + genRanHex(5),
				mpxAccountId: parsed.mpxAccountId,
				mpxGuid: parsed.mpxGuid,
			}),
			dataType: 'json',
			contentType: 'application/json; charset=utf-8',
		}).catch((e) =>
		{
			Swal.fire({
				icon: 'error',
				title: 'Oops...',
				html: `The request was answered with the code <b>${e.status} - ${e.responseJSON.error}</b><br/>${e.responseJSON.message}`,
				color: '#e2e2e2',
				background: '#11161c',
			});

			return null;
		});

		if (!ret)
		{
			console.log('Invalid API response, returning null...');
			return null;
		}

		if (ret.status !== 200 || ret.code !== 200)
		{
			Swal.fire({
				icon: 'error',
				title: 'Oops...',
				html: `Failed to get m3u8 file, response status: <b>${ret.status} - ${ret.code}</b><br/>${ret.message}`,
				color: '#e2e2e2',
				background: '#11161c',
			});

			try
			{
				if (ret.extra) console.log(JSON.parse(ret.extra));
			}
			catch
			{
				console.log(ret.extra);
			}

			return null;
		}

		savedRet = ret;
		b64 = await blobToBase64(new Blob([ret.m3u8], { type: 'application/x-mpegurl' }));
		$('#player_source')[0].src = b64;
		videojs('player');
		$('#main-form').hide();
		$('#player').show();
		$('#download-btns').show();
		loadingModal.close();

		return null;
	});

	$('#download-m3u8').on('click', async () =>
	{
		const tmp = document.createElement('a');

		tmp.href = b64;
		tmp.target = '_blank';
		tmp.download = savedRet.filename + '.m3u8';
		tmp.click();
		tmp.remove();
	});

	$('#download-mp4').on('click', async () =>
	{
		Swal.fire({
			icon: 'error',
			title: 'Oops...',
			html: 'Not implemented',
			color: '#e2e2e2',
			background: '#11161c',
		});
	});
});
