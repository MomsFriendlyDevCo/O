var monoxide = require('monoxide');

module.exports = monoxide.schema('companies', {
	name: String,
	locations: [{
		country: String,
		city: String,
	}],
})
