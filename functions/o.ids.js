var _ = require('lodash');
module.exports = o => {
	o.cli
		.description('Return an array of IDs from the given documents (from a pipe or from a query)')
		.usage('[collection] [query...]')
		.note('This function uses the same query system as `o find`')
		.parse();

	if (o.cli.args.length) { // Trying to run a query - redirect to `o find`
		return o.run('find', '--ids', ...o.cli.args);
	} else { // Redirect to `o pluck`
		return o.run('pluck', '_id');
	}
};
