var _ = require('lodash');
var fs = require('fs');
var fspath = require('path');
var glob = require('globby');
var namor = require('namor');

module.exports = o => {
	o.cli
		.description('Save the entire output stream against a reference')
		.usage('[--save [reference]] | [--load [reference]]')
		.option('--save <reference>', 'Specifies that the output should be saved, this is the default functionality')
		.option('--load <reference>', 'Specifies that the output should be loaded')
		.option('--list', 'List all stashes')
		.option('--delete <glob>', 'Delete all stashes matching a glob')
		.option('-s, --silent', 'Dont display any output, just save')
		.option('--no-stream', 'Bypass streaming large collections to use the internal object emitter (this is used by some internal functions and not meant for humans)')
		.note('If no reference is given when saving a random two word name is used')
		.note('If no reference is given when loading the most recent save is used')
		.note('The `savePath` is variable is used as the location to save to, this can be set per-profile')
		.note('If neither "save" or "load" is specified, "list" is assumed')
		.note('Stashes can also be loaded within queries by prefixing entries with an "@". e.g. "{_id: {\'$in\': @myIds}}"')
		.parse();

	if (o.cli.silent && o.cli.load) throw new Error('Specifying --load and --silent makes no sense');

	if (o.cli.save) {
		// Save mode {{{
		return Promise.resolve()
			.then(()=> fs.promises.mkdir(o.profile.savePath, {recursive: true}))
			.then(()=>
				_.isString(o.cli.save) ? o.cli.save
				: o.cli.args.length ? o.cli.args[0]
				: namor.generate({words: 2, manly: true})
			)
			.then(reference => {
				o.log(1, 'Stashing as', reference);
				var outputStream = fs.createWriteStream(fspath.join(o.profile.savePath, reference + '.json'));
				o.on('collectionStream', stream => stream.pipe(outputStream))
				if (!o.cli.silent) o.on('doc', doc => o.output.doc(o));
			})
			.then(()=> !o.cli.silent && o.output.startCollection())
			.then(()=> o.input.requestCollectionStream(true))
			.then(()=> !o.cli.silent && o.output.endCollection())
		// }}}
	} else if (o.cli.load) {
		// Load mode {{{
		return Promise.resolve()
			.then(()=> {
				if (_.isString(o.cli.load)) return o.cli.load; // User specified reference
				return glob(fspath.join(o.profile.savePath, '*.json'), {stats: true})
					.then(paths => _(paths).sortBy(paths, 'mtime').first().get('path'))
					.then(path => fspath.basename(path, '.json'))
			})
			.then(reference => {
				o.log(1, 'Restoring', reference);
				return reference;
			})
			.then(reference => {
				if (o.cli.stream) {
					return new Promise((resolve, reject) => {
						var inputStream = fs.createReadStream(fspath.join(o.profile.savePath, reference + '.json'));
						inputStream.on('error', e => reject(`Invalid stash: "${reference}"`))
						process.stdout.on('close', resolve);
						inputStream.pipe(process.stdout);
					});
				} else { // Use block reading + emitting
					return fs.promises.readFile(fspath.join(o.profile.savePath, reference + '.json'))
						.then(contents => JSON.parse(contents))
						.then(contents => o.output.collection(contents))
				}
			})
		// }}}
	} else if (o.cli.delete) {
		// Delete stashes {{{
		return Promise.resolve()
			.then(()=> glob(fspath.join(o.profile.savePath, o.cli.delete + '.json')))
			.then(paths => Promise.all(paths.map(path => fs.promises.unlink(path))))
		// }}}
	} else {
		// List mode {{{
		return Promise.resolve()
			.then(()=> !o.cli.silent && o.output.startCollection())
			.then(()=> glob(fspath.join(o.profile.savePath, '*.json'), {stats: true}))
			.then(files => files.forEach(file => o.output.doc({
				name: fspath.basename(file.path, '.json'),
				size: file.size,
				saved: file.mtime,
			})))
			.then(()=> !o.cli.silent && o.output.endCollection())
		// }}}
	}

};
