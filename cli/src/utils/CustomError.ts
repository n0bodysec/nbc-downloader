export class CustomError extends Error
{
	date = new Date();
	extra: Record<string, unknown> | undefined;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(message: string, extra?: Record<string, unknown> | undefined, ...params: any)
	{
		super(...params);

		if (Error.captureStackTrace) Error.captureStackTrace(this, CustomError);

		this.name = 'CustomError';
		this.message = message;
		this.extra = extra;
	}
}
