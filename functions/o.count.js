var _ = require('lodash');
module.exports = o => {
	o.cli
		.description('Count the number of documents in a collection (or run a query and count the results)')
		.usage('[collection] [query...]')
		.note('This function uses the same query system as `o find`)
		.parse();

	if (o.cli.args.length) return o.run('find', '--count', ...o.cli.args); // Trying to run a query - redirect to `o find`

	// Everything else - assume we're just counting results

	var seen = 0;
	o.on('doc', doc => seen++);

	return Promise.resolve()
		.then(()=> o.output.start())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.doc(seen))
		.then(()=> o.output.end())
};
