var _ = require('lodash');
var xlsx = require('xlsx');

module.exports = o => {
	o.cli
		.description('Convert from another format into JSON')
		.usage('[file]')
		.option('--name <sheet>', 'The name of the sheet to use if multiple, otherwise the first is used')
		.note('Supported file types: .csv, .xlsx (and anything else parsed by XLSX - https://sheetjs.gitbooks.io/docs/#file-formats)')
		.note('If no file is specified the intput will be streamed from STDIN (the XLSX module auto-detects the input stream type)')
		.parse();

	if (o.cli.args.length) { // Read from file
		o.log(1, 'Reading data in from', o.cli.args[0]);
		var workbook = xlsx.readFile(o.cli.args[0]);
		var sheet = o.cli.name ? workbook.Sheets[o.cli.name] : _.values(workbook.Sheets)[0];
		if (!sheet) throw new Error(`Invalid sheet name "${o.cli.name}". Valid names are: ${_.keys(workbook.Sheets)}`);

		return o.output.collection(xlsx.utils.sheet_to_json(sheet, {blankrows: false}));
	} else { // Stream from STDIN as CSV
		o.log(1, 'Streaming data in from STDIN');
		return o.input.requestRawSlurp()
			.then(contents =>  {
				var workbook = xlsx.read(contents, {
					type: 'string',
				});

				return xlsx.utils.sheet_to_json(_.values(workbook.Sheets)[0]);
			})
			.then(contents => o.output.collection(contents))
	}
};
