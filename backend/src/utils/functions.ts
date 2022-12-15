export function sendMessage(res: any, status: number, code: number, message: string, extra?: unknown)
{
	return res.send({
		status,
		code,
		message,
		extra,
	});
}

export const getVideoType = (programmingType: string, fullEpisode: string) =>
{
	if (!programmingType || !fullEpisode) return 'Unknown';
	if (programmingType === 'Movie') return 'Movie';
	if (programmingType === 'Full Episode' && fullEpisode === 'true') return 'Show';

	return 'Clip';
};
