var _ = require('lodash');
var axios = require('axios');
var https = require('https');
var siftShorthand = require('sift-shorthand');

module.exports = o => {
	o.cli
		.description('Fetch a remote JSON API endpoint')
		.usage('<url> [post-data]')
		.option('-m, --method <method>', 'Specify the method to use, defaults to GET if no parameters are specified, POST if they are')
		.option('--headers <key=val...>', 'Accept one or more headers to supply in the request', (v, total) => total.concat([v]), [])
		.parse();

	if (!o.cli.args.length) throw new Error('URL is required');
	var url = o.cli.args.shift();
	var body = siftShorthand.values(o.cli.args);
	var method = o.cli.method ? o.cli.method.toUpperCase()
		: _.isEmpty(body) ? 'GET'
		: 'POST';
	var headers = siftShorthand.values(o.cli.headers);

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
		.then(res => {
			o.log(2, 'Got response', res.data);
			return o.output.any(res.data)
		})
};
