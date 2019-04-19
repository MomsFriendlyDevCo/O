var _ = require('lodash');
module.exports = o => {
	o.cli
		.description('Pass an entire collection though an external function, returning the result')
		.note('This function is really just an alias for `o map --collection`, see that functions documentation for details')
		.parse();

	// Redirect to `o map --collection`
	return o.run('map', '--collection', ...o.cli.args);
};
