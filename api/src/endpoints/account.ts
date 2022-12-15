import axios from 'axios';
import { API } from '..';
import { constants } from '../constants';

export class Account
{
	constructor(private base: API) { }

	register = async (username: string, email: string, password: string, name: string, surname: string, gender: string, zipNumber: string, birthYear: number, uuid?: string) =>
	{
		// checks by NBC.com
		if (username !== email) throw new Error('username and email must be the same');
		// if (gender.match(/^(Man|Woman|Non-Binary|Prefer Not to Say)$/) === null) throw new Error('gender type is not allowed'); // TODO: check typeof string
		// if (birthYear < 1922 || birthYear > 2004) throw new Error('birthYear is not in a valid range'); // TODO: check typeof number
		// check valid zip number? typeof string

		this.base.username = username;
		this.base.password = password;

		const headers = {
			'Content-Type': 'application/json',
			'X-Idm-Brand-Source': 'nbcd_web',
			Idm_tx_ref: uuid ?? this.base.idm_tx_ref,
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

	registerSimple = async (email: string, password: string) => this.register(email, email, password, 'John', 'Doe', 'Man', '11111', 1990);

	getSession = async (username = this.base.username, password = this.base.password, uuid: string | undefined = undefined) =>
	{
		//! If you send 6 getSession() with invalid password, the account will be LOCKED

		if (username == null) throw new Error('username cannot be null nor undefined');
		if (password == null) throw new Error('password cannot be null nor undefined');

		this.base.username = username;
		this.base.password = password;

		const headers = {
			Idmversion: 'v2',
			'X-Idm-Brand-Source': 'None',
			'X-Idm-Password': this.base.utils.encodePassword(),
			'X-Idm-Username': username,
			Vppa_re_opt_in: true,
			Idm_tx_ref: uuid ?? this.base.idm_tx_ref,
		};

		const ret = await axios.get(constants.SESSION_URL, { headers });
		if (ret.data.result.code === 200) this.base.tokenId = ret.data.session.tokenId;

		return ret;
	};

	getProfile = async (tokenId = this.base.tokenId, uuid: string | undefined = undefined) =>
	{
		if (tokenId == null) throw new Error('tokenId cannot be null nor undefined');

		const headers = {
			Session_token: tokenId,
			Idmversion: 'v2',
			'X-Idm-Brand-Source': 'nbcd_web',
			Idm_tx_ref: uuid ?? this.base.idm_tx_ref,
		};

		return axios.get(constants.PROFILE_URL, { headers });
	};
}
