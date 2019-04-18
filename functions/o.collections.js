var _ = require('lodash');

module.exports = o => {
	o.cli
		.description('Output the available collections')
		.parse();


	return Promise.resolve()
		.then(()=> o.db.connect())
		.then(()=> {
			o.log('Known collections:');
			_.keys(o.db.models)
				.sort()
				.forEach(m => o.log(' ', m));
		})
};
