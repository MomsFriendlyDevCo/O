module.exports = o => {
	o.cli
		.description('Return only a certain number of documents within a collection')
		.usage('<number>')
		.parse();

	if (!o.cli.args.length) throw new Error('Limit value must be specified');
	if (o.cli.args.length > 1) throw new Error('Only one limit value is supported');
	var limit = parseInt(o.cli.args[0]);
	if (!isFinite(limit) || limit < 1) throw new Error('Only finite, positive numbers are supported');

	o.on('doc', (doc, docIndex) => {
		if (docIndex >= limit) return; // Dont output the tail documents

		return o.output.doc(doc);
	});

	return Promise.resolve()
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.endCollection())
};
