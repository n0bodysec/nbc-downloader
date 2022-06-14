import axios from 'axios';
import constants from '../utils/constants.js';

class account
{
	constructor (base)
	{
		this.register = async (username, email, password, name, surname, gender, zipNumber, birthYear, randomUUID = false) =>
		{
			// checks by NBC.com
			if (username !== email) throw new Error('username and email must be the same');
			// if (gender.match(/^(Man|Woman|Non-Binary|Prefer Not to Say)$/) === null) throw new Error('gender type is not allowed'); // TODO: check typeof string
			// if (birthYear < 1922 || birthYear > 2004) throw new Error('birthYear is not in a valid range'); // TODO: check typeof number
			// check valid zip number? typeof string

			base.username = username;
			base.password = password;

			const headers = {
				'Content-Type': 'application/json',
				'X-Idm-Brand-Source': 'nbcd_web',
				Idm_tx_ref: base.getUUID(randomUUID),
			};

			const request = JSON.stringify({
				givenName: name,
				sn: surname,
				gender,
				serviceZip: zipNumber,
				birthYear,
				userName: username,
				mail: email,
				password,
			});

			return axios.post(constants.REGISTER_URL, request, { headers });
		};

		this.registerSimple = async (email, password) => this.register(email, email, password, 'John', 'Doe', 'Man', '11111', 1990);

		this.getSession = async (username = base.username, password = base.password, randomUUID = false) =>
		{
			if (username == null) throw new Error('username cannot be null nor undefined');
			if (password == null) throw new Error('password cannot be null nor undefined');

			base.username = username;
			base.password = password;

			const headers = {
				Idmversion: 'v2',
				'X-Idm-Brand-Source': 'None',
				'X-Idm-Password': base.utils.encodePassword(),
				'X-Idm-Username': username,
				Vppa_re_opt_in: true,
				Idm_tx_ref: base.getUUID(randomUUID),
			};

			const ret = await axios.get(constants.SESSION_URL, { headers });
			if (ret.data.result.code === 200) base.tokenId = ret.data.session.tokenId;

			return ret;
		};

		this.getProfile = async (tokenId = base.tokenId, randomUUID = false) =>
		{
			if (tokenId == null) throw new Error('tokenId cannot be null nor undefined');

			const headers = {
				Session_token: tokenId,
				Idmversion: 'v2',
				'X-Idm-Brand-Source': 'nbcd_web',
				Idm_tx_ref: base.getUUID(randomUUID),
			};

			return axios.get(constants.PROFILE_URL, { headers });
		};
	}
}

export default account;
