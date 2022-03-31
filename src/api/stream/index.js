import axios from 'axios';
import constants from '../utils/constants.js';

const stream = function stream(api) // eslint-disable-line no-unused-vars
{
	this.getLink = async (mpxGuid, mpxAccountId, idmToken, date = undefined) =>
	{
		const headers = {
			'Content-Type': 'application/json',
			Authorization: `NBC-Referrer key=desktop_nbcuniversal,version=3.0,time=${date || new Date(Date.now()).toISOString()},idmToken=${idmToken}`,
			Referer: 'https://www.nbc.com/',
		};

		const request = JSON.stringify({
			device: 'web',
			mpxAccountId,
		});

		const ret = await axios.post(constants.ACCESS_VOD_URL + mpxGuid, request, { headers });
		return ret;
	};

	this.getSmilHls = async (link) =>
	{
		// link: return of this.getLink()
		const ret = await axios.get(link + '&switch=HLSServiceSecure&format=SMIL');
		return ret;
	};
};

export default stream;
