var _ = require('lodash');

module.exports = o => {
	o.cli
		.description('Transform JSON collections into one-item-per-line format')
		.option('-d, --delimiter <string>', 'Specify the string delimeter if not newline', '\n')
		.parse();

	o.on('doc', doc =>
		o.output.write(
			JSON.stringify(doc, null, null) + o.cli.delimiter
		)
	);

	return Promise.resolve()
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.output.end())
};
