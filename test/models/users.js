var monoxide = require('monoxide');

module.exports = monoxide
	.schema('users', {
		company: {type: 'pointer', ref: 'companies', index: true},
		name: String,
		status: {type: 'string', enum: ['active', 'unverified', 'deleted'], default: 'unverified', index: true},
		role: {type: String, enum: ['user', 'admin'], default: 'user', index: true},
		_password: String,
		favourite: {
			color: {type: 'string'},
			animal: {type: 'string'},
		},
		settings: {
			lang: {type: String, enum: ['en', 'es', 'fr'], default: 'en'},
			greeting: {type: 'string', default: 'Hello'},
		},
	})
	.virtual('password',
		()=> 'RESTRICTED',
		pass => { // Very crappy, yet predictable password hasher that removes all consonants
			this._password = pass
				.toLowerCase()
				.replace(/[^aeiou]+/g, '');
		}
	)
	.virtual('passwordStrength', ()=> this._password.length || 0) // Returns the length of the (badly, see above) hashed password which is an approximate indicator of hash strength
