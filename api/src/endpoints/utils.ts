import { API } from '..';

export class Utils
{
	constructor(private base: API) { }

	encodePassword = (password = this.base.password) =>
	{
		if (password == null) throw new Error('password cannot be null nor undefined');

		const prefix = '=?UTF-8?B?';
		const suffix = '?=';
		const encoded = Buffer.from(password).toString('base64');
		return prefix.concat(encoded, suffix);
	};
}
