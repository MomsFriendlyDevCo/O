var _ = require('lodash');
var axios = require('axios');
var crypto = require('crypto')
var fs = require('fs');
var https = require('https');
var os = require('os');
var siftShorthand = require('sift-shorthand');
var temp = require('temp');

module.exports = o => {
	o.cli
		.description('Fetch a remote JSON API endpoint')
		.usage('<url> [post-data]')
		.option('-m, --method <method>', 'Specify the method to use, defaults to GET if no parameters are specified, POST if they are')
		.option('-c, --cache [path]', 'Use the specified path if it exists, otherwise download to the file + use it')
		.option('--headers <key=val...>', 'Accept one or more headers to supply in the request', (v, total) => total.concat([v]), [])
		.note('--cache can be used to avoid excessive pulling from remote servers if the file already exists')
		.note('If no path with --cache is speified the SHA1 of the method+url is used in the default temporary directory')
		.parse();

	if (!o.cli.args.length) throw new Error('URL is required');
	var url = o.cli.args.shift();
	var body = siftShorthand.values(o.cli.args);
	var method = o.cli.method ? o.cli.method.toUpperCase()
		: _.isEmpty(body) ? 'GET'
		: 'POST';
	var headers = siftShorthand.values(o.cli.headers);

	// Replace o.cli.cache with a hased version of the request if the user didn't specify something explicitly {{{
	if (o.cli.cache === true) {
		o.log(3, 'Calculating JSON object hash for caching');
		o.cli.cache =
			os.tmpdir()
			+ '/'
			+ crypto
				.createHash('sha1')
				.update(JSON.stringify({
					method, url, headers, body
				}))
				.digest('hex')
			+ '.json'
	}
	// }}}

	return Promise.resolve()
		// Calculate the cache path (or use the --cache <path> if specified) {{{
		.then(()=> {
			if (!o.cli.cache) return;

			return fs.promises.access(o.cli.cache, fs.constants.R_OK)
				.then(()=> {
					o.log(1, 'Reading from cache file', o.cli.cache);
					return fs.promises.readFile(o.cli.cache)
						.then(content => JSON.parse(content))
				})
				.catch(()=> {
					o.log(2, 'No intial cache file state found at', o.cli.cache);
					o.cli.cacheInitial = true;
				})
		})
		// }}}
		// Make the request {{{
		.then(content => {
			if (content) return content; // Cache already had content - pass that through

			o.log(1, 'Requesting URL', url, `(via method ${method})`);
			if (!_.isEmpty(headers)) o.log(2, 'Using HEADERS', headers);
			if (!_.isEmpty(body)) o.log(2, 'Using BODY', body);

			return axios({
				url, method,
				headers: _.isEmpty(headers) ? undefined : headers,
				data: _.isEmpty(body) ? undefined : body,
				responseType: 'json',
				httpsAgent: new https.Agent({
					rejectUnauthorized: false,
				}),
			})
				.then(({data}) => data)
		})
		// }}}
		// Output into stream + optionally cache {{{
		.then(data => {
			o.log(2, 'Got response', data);
			return Promise.all([
				o.output.any(data),

				o.cli.cache && o.cli.cacheInitial && Promise.resolve()
					.then(()=> o.log(1, 'Writing to cache file', o.cli.cache))
					.then(()=> fs.promises.writeFile(o.cli.cache, JSON.stringify(data))),
			])
		})
		// }}}
};
