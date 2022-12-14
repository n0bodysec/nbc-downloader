import { randomUUID } from 'crypto';
import { Account } from './endpoints/account';
import { Stream } from './endpoints/stream';
import { Utils } from './endpoints/utils';

export class API
{
	idm_tx_ref = randomUUID();
	tokenId?: string;
	username?: string;
	password?: string;

	account: Account = new Account(this);
	stream: Stream = new Stream(this);
	utils: Utils = new Utils(this);
}
