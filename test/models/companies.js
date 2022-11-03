var mongoosy = require('@momsfriendlydevco/mongoosy');

module.exports = ()=> mongoosy.schema('companies', {
	name: String,
	locations: [{
		country: String,
		city: String,
	}],
})
