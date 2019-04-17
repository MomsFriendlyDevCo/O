var _ = require('lodash');

module.exports = o => {
	o.cli
		.description('Output the currently active profile (or show other profiles)')
		.name('o profile')
		.usage('[profile]')
		.option('-l, --list', 'List all known profiles')
		.option('--no-obscure', 'Disable obscuring of things that look like passwords')
		.parse();

	if (o.cli.list) {
		o.log('Known profiles:')
		_.keys(o.settings).forEach(p =>
			p == o.profile.profile
				? o.log(' ', p, '(ACTIVE)')
				: o.log(' ', p)
		);
	} else { // Show current profile
		o.log(
			o.output.json(
				o.cli.obscure
					? _.cloneDeepWith(o.profile, v =>
						_.isString(v) ? o.output.obscure(v) : undefined
					)
					: o.profile
			)
		);
	}
};
