var _ = require('lodash');
module.exports = o => {
	o.cli
		.description('Count the number of documents in a collection (or run a query and count the results)')
		.name('o find')
		.usage('[collection] [query...]')
		.parse();

	if (o.cli.args.length) return o.redirect('find', ['--count', ...o.cli.args]); // Trying to run a query - redirect to `o find`

	// Everything else - assume we're just counting results

	var seen = 0;
	o.on('doc', doc => seen++);

	return Promise.resolve()
		.then(()=> o.output.start())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.doc(seen))
		.then(()=> o.output.end())
};
