var _ = require('lodash');

module.exports = o => {
	o.cli
		.description('Transform JSON `squish`d streams back into object collections')
		.parse();

	o.on('doc', doc =>
		o.output.doc(
			JSON.parse(doc)
		)
	);

	return Promise.resolve()
		.then(()=> o.output.startCollection())
		.then(()=> o.input.requestArrayStream())
		.then(()=> o.output.endCollection())
};
