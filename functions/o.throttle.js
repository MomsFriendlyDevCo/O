var cli = require('commander');
var timestring = require('timestring');

module.exports = o => {
	o.cli
		.description('Reduce the throughput of documents to the specified number of items per time period')
		.usage('[--limit <number>] [--per <timestring>] [--delay <timestring>]')
		.option('--limit <number>', 'Number of documents to limit per period')
		.option('--per <timestring>', 'Time period to limit to')
		.option('--delay <timestring>', 'Delay per record')
		.parse();

	if (o.cli.limit) throw new Error('FIXME: --limit is not yet supported');
	if (o.cli.per) throw new Error('FIXME: --per is not yet supported');

	var delay = o.cli.delay ? timestring(o.cli.delay, 'ms') : 0;
	o.log(1, 'Throttling each record by', delay + 'ms');

	o.on('doc', doc =>
		o.output.doc(doc)
			.then(()=> new Promise(resolve => setTimeout(resolve, delay)))
	);

	return Promise.resolve()
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.endCollection())
};
