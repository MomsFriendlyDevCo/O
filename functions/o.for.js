var _ = require('lodash');
var spawn = require('child_process').spawn;

module.exports = o => {
	o.cli
		.description('Loop over an input set of documents and perform a shell operation (usually another O function)')
		.option('--map', 'Accept the output of each process as a map operation')
		.option('-v, --var <variable>', 'Variable name to use when looping, default is "doc"')
		.option('-t, --type <docs|collection|raw>', 'Input type to process (default is \'docs\')', 'docs')
		.option('-f, --feed', 'Feed the sub-process the current record via STDIN')
		.option('--no-template', 'Do not run output arguments though a template before running (disables --var)')
		.option('--raw', 'Alias of `--type=raw')
		.option('--wrap', 'Wrap single-object output in an array')
		.usage('<command>')
		.note('The Lodash templating engine (`_.template`) is used to rewrite commands, see its documentation for details on syntax - https://lodash.com/docs/4.17.11#template')
		.note('When templating is enabled each command is given a `doc` object, `index` offset number (zero-based) and `_` (Lodash)')
		.parse();

	if (o.cli.raw) o.cli.type = 'raw';

	o.log(1, 'Will', o.cli.map ? 'map' : 'run and discard', '<', o.cli.args.join(' '), '> for each document', o.cli.template ? 'using templating' : 'NOT using templating');

	var mainCmd = o.cli.args.shift();
	var argsTemplate = o.cli.args.map(a => _.template(a));

	o.on('doc', (doc, docIndex) => new Promise((resolve, reject) => {
		var buf = ''; // Output buffer
		var proc = spawn(
			mainCmd,
			!o.cli.template
				? o.cli.args
				: argsTemplate.map(a => a({doc, docIndex, _})),
			{
				env: process.env,
				stdio: [
					o.cli.feed ? 'pipe' : 'ignore', // Make STDIN a pipe if we are providing data, otherwise ignore
					o.cli.map ? 'pipe' : 'inherit', // Make STDOUT a readable pipe when in Map mode, otherwise passthru
					'inherit', // STDERR should be this processes STDERR
				],
				shell: true,
			},
		);
		proc.on('error', reject);
		proc.on('close', code => {
			if (code != 0) return reject(`Non-zero exit code ${code}`);
			if (o.cli.map) {
				var parsed = JSON.parse(buf);
				if (o.cli.type == 'docs') {
					if (_.isArray(parsed) && parsed.length == 1) {
						o.output.doc(parsed[0]).then(resolve)
					} else if (_.isArray(parsed)) {
						reject(`Unknown return type - wanted documents but got ${parsed.length} instead of one`);
					} else if (_.isObject(parsed)) {
						o.output.doc(parsed).then(resolve)
					} else {
						reject('Unknown return type - wanted documents but got something else');
					}
				} else if (o.cli.type == 'collection') {
					if (_.isArray(parsed)) {
						o.output.collection(parsed).then(resolve)
					} else {
						reject('Unknown return type - wanted a collection but got something else');
					}
				} else {
					reject('Unknown return type');
				}
			} else {
				// Didn't care about output - just resolve
				resolve();
			}
		});

		// Spew input document into STDIN of sub-process - then close
		if (o.cli.feed) proc.stdin.end(JSON.stringify(doc));

		// Listen to STDOUT if we are mapping
		if (o.cli.map) proc.stdout.on('data', data => buf += data.toString());
	}));

	return Promise.resolve()
		.then(()=> o.cli.type == 'docs' ? o.output.startCollection() : o.output.start())
		.then(()=> o.input.requestCollectionStream())
		.then(()=> o.cli.type == 'docs' ? o.output.endCollection() : o.output.end())
};
