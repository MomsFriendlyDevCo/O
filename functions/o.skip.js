module.exports = o => {
	o.cli
		.description('Return an offset of documents within a collection')
		.usage('<number>')
		.parse();

	if (!o.cli.args.length) throw new Error('Skip value must be specified');
	if (o.cli.args.length > 1) throw new Error('Skip one skip value is supported');
	var skip = parseInt(o.cli.args[0]);
	if (!isFinite(skip) || skip < 1) throw new Error('Only finite, positive numbers are supported');

	o.on('doc', (doc, docIndex) => {
		if (docIndex < skip) return; // Dont output the head documents
		return o.output.doc(doc);
	});

	return Promise.resolve()
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.endCollection())
};
