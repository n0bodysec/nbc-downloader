class utils
{
	constructor(base)
	{
		this.encodePassword = (password = base.password) =>
		{
			if (password == null) throw new Error('password cannot be null nor undefined');

			const prefix = '=?UTF-8?B?';
			const suffix = '?=';
			const encoded = Buffer.from(password).toString('base64');
			return prefix.concat(encoded, suffix);
		};
	}
}

export default utils;
