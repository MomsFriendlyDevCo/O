var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var setup = require('./setup');

describe('`o for`', function() {
	this.timeout(10 * 1000);
	before(setup.initEnvironment);

	it('pass through simple documents', ()=>
		exec(`o for --map --feed cat <${__dirname}/scenarios/users.json`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				res.forEach(r => {
					expect(r).to.be.an('object');
					expect(r).to.have.property('name');
					expect(r).to.have.property('company');
				});
			})
	);

	it('map documents using other o functions', ()=>
		exec(`o for --map --feed ${__dirname}/../o.js select -vvv name <${__dirname}/scenarios/users.json`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				res.forEach(r => {
					expect(r).to.be.an('object');
					expect(r).to.have.property('name');
					expect(Object.keys(r)).to.be.deep.equal(['name']);
				});
			})
	);

	// FIXME: exec() seems to choke on escaping ${var} items
	it.skip('map documents using dynamic variables', ()=>
		exec(`o for --raw echo \\\${doc.favourite.color} <${__dirname}/scenarios/users.json`)
			.then(res => {
				expect(res).to.be.a('string');
				expect(res.split('\n')).to.have.length(6);
				res.split('\n').forEach(r => {
					expect(r).to.be.a('string');
					expect(r).to.be.oneOf(['red', 'yellow', 'blue']);
				});
			})
	);

	it('map documents using multiple commands and dynamic variables', ()=>
		exec(`o for --raw 'echo \\\${doc.favourite.color} <${__dirname}/scenarios/users.json | cat'`)
			.then(res => {
				expect(res).to.be.a('string');
				expect(res.split('\n')).to.have.length(6);
				res.split('\n').forEach(r => {
					expect(r).to.be.a('string');
					expect(r).to.be.oneOf(['red', 'yellow', 'blue']);
				});
			})
	);

});
