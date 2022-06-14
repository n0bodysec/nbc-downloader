import crypto from 'crypto';
import axios from 'axios';
import constants from '../utils/constants.js';

class account
{
	constructor (api)
	{
		this.register = async (username, email, password, name, surname, gender, zipNumber, birthYear) =>
		{
			// checks by NBC.com
			if (username !== email) throw new Error('username and email must be the same');
			// if (gender.match(/^(Man|Woman|Non-Binary|Prefer Not to Say)$/) === null) throw new Error('gender type is not allowed'); // TODO: check typeof string
			// if (birthYear < 1922 || birthYear > 2004) throw new Error('birthYear is not in a valid range'); // TODO: check typeof number
			// check valid zip number? typeof string
			const headers = {
				'Content-Type': 'application/json',
				'X-Idm-Brand-Source': 'nbcd_web',
				Idm_tx_ref: crypto.randomUUID(),
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

		this.getSession = async (username, password) =>
		{
			const headers = {
				Idmversion: 'v2',
				'X-Idm-Brand-Source': 'None',
				'X-Idm-Password': api.utils.encodePassword(password),
				'X-Idm-Username': username,
				Vppa_re_opt_in: true,
				Idm_tx_ref: crypto.randomUUID(),
			};

			return axios.get(constants.SESSION_URL, { headers });
		};
	}
}

export default account;
