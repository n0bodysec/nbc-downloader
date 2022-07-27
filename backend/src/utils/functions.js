export function sendMessage(res, status, code, message, extra = undefined)
{
	return res.send({
		status,
		code,
		message,
		extra: extra ?? undefined,
	});
}

export const getLineContainingStr = (data, str) =>
{
	const lines = data.split('\n');
	for (let i = 0; i < lines.length; i++)
	{
		if (lines[i].indexOf(str) !== -1) return lines[i];
	}

	return null;
};
export const getVideoType = (programmingType, fullEpisode) =>
{
	if (programmingType === undefined || fullEpisode === undefined) return 'Unknown';
	if (programmingType === 'Movie') return 'Movie';
	if (programmingType === 'Full Episode' && fullEpisode === 'true') return 'Show';

	return 'Clip';
};
