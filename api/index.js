import { randomUUID } from 'crypto';
import Account from './account/index.js';
import Stream from './stream/index.js';
import Utils from './utils/index.js';

class API
{
	constructor()
	{
		this.idm_tx_ref = randomUUID();
		this.tokenId = null;
		this.username = null;
		this.password = null;

		this.account = new Account(this);
		this.stream = new Stream(this);
		this.utils = new Utils(this);
	}
}

export default API;
