import axios from 'axios';
import { CustomError } from '../utils/CustomError';

export async function parse(url: string)
{
	const re = /^(https?:\/\/)?(www\.)?nbc\.com\/[A-Za-z0-9-]+\/video\/[A-Za-z0-9-]+\/[0-9]+$/;
	if (!re.test(url)) throw new CustomError('The entered URL is not from an nbc.com video. It should be something like: https://www.nbc.com/<show>/video/<name>/<id>');

	const res = await axios.get(url);
	if (res.status !== 200) throw new CustomError(`Axios returned HTTP Status ${res.status}`);

	// const htmlTitle = res.data.match(/<title.*?>Watch (.*) - NBC.com<\/title>/)[1];
	const mpxGuid = res.data.match(/"mpxGuid":"([0-9]+)"/)[1];
	const mpxAccountId = res.data.match(/"mpxAccountId":"([0-9]+)"/)[1];

	return { mpxAccountId, mpxGuid };
}
