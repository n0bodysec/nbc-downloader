import Account from './account/index.js';
import Stream from './stream/index.js';
import Utils from './utils/index.js';

const API = function API()
{
	this.account = new Account(this);
	this.stream = new Stream(this);
	this.utils = new Utils(this);
};

export default API;
