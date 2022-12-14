import axios from 'axios';
import { API } from '..';
import { constants } from '../constants';

export class Stream
{
	constructor(private base: API) { }

	getLink = async (mpxGuid: number, mpxAccountId: number, idmToken = this.base.tokenId, date: string | undefined = undefined) =>
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

	static getSmilHls = async (link: string) => axios.get(link + '&switch=HLSServiceSecure&format=SMIL'); // link: return of this.getLink()
}
