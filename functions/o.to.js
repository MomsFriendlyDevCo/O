var _ = require('lodash');
var xlsx = require('xlsx');

module.exports = o => {
	o.cli
		.description('Convert from a collection to another format')
		.usage('[file]')
		.option('--name <name>', 'The name of the worksheet (default is "Data")', 'Data')
		.option('--format <format>', 'Specify the format when outputting to STDOUT. Can be "csv" (default) or "html"', 'csv')
		.note('Supported file types: .csv, .xlsx (and other CSV style files)')
		.note('If no file is specified the output will be streamed to STDOUT in the format specified by --format')
		.parse();

	if (!['csv', 'html'].includes(o.cli.format)) throw new Error('STDOUT output formats can only be "csv" or "html"');

	o.on('collection', docs => {
		var sheet = xlsx.utils.json_to_sheet(docs);

		if (o.cli.args.length) { // Read from file
			o.log(1, 'Converting', docs.length, 'rows to file', o.cli.args[0]);
			var workbook = xlsx.utils.book_new();
			xlsx.utils.book_append_sheet(workbook, sheet, o.cli.name);
			xlsx.writeFile(workbook, o.cli.args[0]);
		} else if (o.cli.format == 'csv') { // Pipe to STDOUT as CSV
			o.log(1, 'Converting', docs.length, 'rows to CSV output');
			var stream = xlsx.stream.to_csv(sheet);
			o.output.stream(stream);
		} else if (o.cli.format == 'html') { // Pipe to STDOUT as HTML
			o.log(1, 'Converting', docs.length, 'rows to HTML output');
			var stream = xlsx.stream.to_html(sheet);
			o.output.stream(stream);
		} else {
			throw new Error('Unknown conversion process - this shouldnt happen');
		}
	});

	return o.input.requestCollectionStream(blocking = true);
};
