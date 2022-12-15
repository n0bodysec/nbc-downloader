const constants = Object.freeze({
	IS_PRODUCTION: process.env.NODE_ENV === 'production',
	LIB_VERSION: '2.0.0',
	USER_AGENT: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
});

export { constants };
