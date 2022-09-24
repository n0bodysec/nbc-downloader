export default class CustomError extends Error
{
	constructor(name = 'CustomError', ...params)
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
