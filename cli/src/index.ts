import * as colorette from 'colorette';
import { program } from 'commander';
import { download } from './actions/download';
import { constants } from './utils/constants';

program
	.name('nbc-downloader')
	.description('nbc.com downloader from cli')
	.version(constants.LIB_VERSION);

program.command('download')
	.description('download an ad-free & region-free .m3u8')
	.argument('<url>', 'a valid video url')
	.option('-u, --username <email>', 'account email address')
	.option('-p, --password <password>', 'account password')
	.option('-r, --register', 'register a new account instead of login with the specified credentials')
	.option('-P, --proxy <url>', 'http get proxy url')
	.option('-o, --output <filename>', 'output filename')
	.option('-b, --batch', 'never ask for user input, use the default behaviour')
	.option('-v, --verbose', 'display extended logging information', ((dummyValue, previous) => previous + 1), 0)
	.action(download);

colorette.createColors({ useColor: true });
program.parse(process.argv);
