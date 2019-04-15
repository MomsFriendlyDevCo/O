var timestring = require('timestring');

module.exports = o => {
	o.cli
		.description('Reduce the throughput of documents to the specified number of items per time period')
		.usage('--refresh <timestring> | --per <number>')
		.option('--refresh <timestring>', 'How often to output a progress message (default is 1s)')
		.option('--per <timestring>', 'How many documents to update by')
		.option('--prefix <string>', 'What prefix to use when outputting (default is "Processed")')
		.option('--suffix <string>', 'What suffix to use when outputting (default is "documents")')
		.parse();

	if (o.cli.refresh && o.cli.per) throw new Error('Only one of --refresh OR --per must be specified');
	if (!o.cli.refresh || !o.cli.per) o.cli.refresh = '1s';

	var refresh;
	if (o.cli.refresh) {
		refresh = timestring(o.cli.refresh, 'ms');
		o.log(1, 'Show progress every', refresh + 'ms');
	} else {
		o.log(1, 'Show progress every', o.cli.per, 'documents');
	}

	var lastRefresh = 0;
	o.on('doc', (doc, docIndex) => {
		var now = Date.now();
		o.output.doc(doc);
		if (
			(o.cli.per && (docIndex % (o.cli.per+1)) == 0) // We have exported enough docs
			|| (refresh && (!lastRefresh || now - lastRefresh > refresh)) // We have gone beyond when we should next be refreshing
		) {
			o.log(0, o.cli.prefix || 'Processed', docIndex+1, o.cli.suffix || 'documents')
			lastRefresh = now;
		}
	});

	return Promise.resolve()
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.endCollection())
};
