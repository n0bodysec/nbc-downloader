export type HackyAny = any;

export type commanderOptions = {
	// [key: string]: unknown,
	username: string | undefined,
	password: string | undefined,
	register: boolean,
	proxy: string | undefined,
	output: string | undefined,
	batch: boolean,
	verbose: number,
};

export type videoAny = HackyAny;
export type switchRef = HackyAny;
/* export type switchRef = {
	'$': {
		src: string;
		title: string;
		abstract: string;
		dur: string;
		guid: string;
		categories: string;
		keywords: string;
		ratings: string;
		provider: string;
		type: string;
		height: string;
		width: string;
		clipBegin: string;
		clipEnd: string;
	};
	param: [{
		'$': {
			name: string;
			value: string;
		};
	}];
}; */

export type smilData = HackyAny;
/* export type smilData = {
	[key: string]: unknown;
	smil: {
		'$': {
			xmlns?: string;
		};
		head: unknown;
		body: [{
			seq: [{
				ref: any[];
				par: [{
					switch: [{
						video: [{
							'$': {
								src: string;
								'system-bitrate': string;
								height: string;
								width: string;
							};
						}];
						ref: [{
							'$': {
								src: string;
								title: string;
								abstract: string;
								dur: string;
								guid: string;
								categories: string;
								keywords: string;
								ratings: string;
								provider: string;
								type: string;
								height: string;
								width: string;
								clipBegin: string;
								clipEnd: string;
							};
							param: [{
								'$': {
									name: string;
									value: string;
								};
							}];
						}];
					}];
					textstream: [{
						'$': {
							src: string;
							lang: string;
							type: string;
						};
					}];
					imagestream: [{
						'$': {
							src: string;
							width: string;
							height: string;
							type: string;
						};
					}];
				}];
			}];
		}];
	};
}; */
