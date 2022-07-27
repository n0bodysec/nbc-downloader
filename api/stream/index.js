import axios from 'axios';
import constants from '../utils/constants.js';

class stream
{
	constructor (base)
	{
		this.getLink = async (mpxGuid, mpxAccountId, idmToken = base.tokenId, date = undefined) =>
		{
			if (idmToken == null) throw new Error('idmToken cannot be null nor undefined');

			const headers = {
				'Content-Type': 'application/json',
				Authorization: `NBC-Referrer key=desktop_nbcuniversal,version=3.0,time=${date ?? new Date(Date.now()).toISOString()},idmToken=${idmToken}`,
				Referer: 'https://www.nbc.com/',
			};

			const request = JSON.stringify({
				device: 'web',
				mpxAccountId,
			});

			return axios.post(constants.ACCESS_VOD_URL + mpxGuid, request, { headers });
		};

		this.getSmilHls = async (link) => axios.get(link + '&switch=HLSServiceSecure&format=SMIL'); // link: return of this.getLink()
	}
}

export default stream;
