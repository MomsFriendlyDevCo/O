#!/bin/sh
":" //# comment; exec /usr/bin/env node --no-warnings "$0" "$@"
// ^^^ Weird hack to disable warnings - https://gist.github.com/rachidbch/5985f5fc8230b45c4b516ce1c14f0832

var _ = require('lodash');
var commander = require('commander');
var commanderExtras = require('commander-extras');
var ini = require('ini');
var fs = require('fs');
var fspath = require('path');
var glob = require('globby');
var os = require('os');
var siftShorthand = require('sift-shorthand');

var o = require('./index'); // Create initial session

Promise.resolve()
	// Read in config file (if any) {{{
	// Read in ~/.o {{{
	.then(()=> process.env.HOME &&
		fs.promises.readFile(fspath.join(os.homedir(), '.o'), 'utf-8')
			.then(contents => ini.decode(contents))
			.then(contents => _.merge(o.settings, contents))
			.catch(()=> {}) // Ignore non-existant config files
	)
	// }}}
	// Read in $PWD/.o {{{
	.then(()=> process.env.PWD &&
		fs.promises.readFile(fspath.join(process.env.PWD, '.o'), 'utf-8')
			.then(contents => ini.decode(contents))
			.then(contents => _.merge(o.settings, contents))
			.catch(()=> {}) // Ignore non-existant config files
	)
	// }}}
	.then(()=> o.settings.global && _.merge(o.profile, o.settings.global)) // Merge global profile
	.then(()=> o.settings.output && process.stdout.isTTY && _.merge(o.profile, o.settings.output)) // Merge output profile if we are an TTY endpoint
	.then(()=> {
		if (process.env.O) { // Adopt a specific profile
			if (!o.settings[process.env.O]) throw new Error(`Unknown profile to switch to profile "${process.env.O}" in "O" environment variable`);
			_.merge(o.profile, o.settings[process.env.O]);
			o.profile.profile = process.env.O;
		} else if (o.settings.default) { // Adopt default profile if it exists
			_.merge(o.profile, o.settings.default);
			o.profile.profile = 'default';
		}
	})
	.then(()=> process.env.O_PROFILE && _.merge(o.profile, siftShorthand.values(process.env.O_PROFILE))) // Merge user specified profile data
	.then(()=> o.init.profile())
	// }}}
	.then(()=> o.init.functions())
	// Create commander UI {{{
	.then(()=> {
		var func = process.argv.slice(2).find(a => !a.startsWith('-')); // Find first probable command

		if (process.argv.length <= 2 || !func) { // No commands given - display universal help
			o.cli = commander
				.version(require('./package.json').version)
				.name('o')
				.usage('<function> [arguments]')
				.option('-v, --verbose', 'Be verbose - use multiple to increase verbosity', (v, total) => total + 1, 0)
				.env('O', 'Set the string ID of the profile to use from the users ~/.o INI file')
				.env('O_PROFILE', 'Set various profile options at once, can be JSON, HanSON or key=val CSV format')
				.on('--help', ()=> {
					console.log('');
					console.log('Available commands:');
					console.log('');
					_.forEach(o.functions, (v, k) => console.log('  o', k));
					console.log('(Use `o <function> --help` for help with individual commands)');
					console.log('');
				})
				.parse(process.argv)

			if (process.argv.length <= 2) o.cli.outputHelp();
		} else if (o.functions[func]) { // Pass control to sub-command
			return o.run(func, ...process.argv.slice(3))
		} else {
			throw new Error(`Unknown O function: ${func}`);
		}
	})
	// }}}
	.then(()=> process.exit(0))
	.catch(e => {
		o.log(0, e.toString())
		process.exit(1);
	})
