var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var setup = require('./setup');

describe('`o squish`', function() {
	this.timeout(10 * 1000);
	before(setup.initEnvironment);

	it('pass through simple documents', ()=>
		exec(`o squish <${__dirname}/scenarios/users.json`, {json: false})
			.then(res => {
				expect(res).to.be.a('string');
				res = res.split(/\n/);

				expect(res).to.have.length(7);
				res.forEach(line => {
					expect(line).to.be.a('string');
					expect(line).to.match(/^{/);
					expect(line).to.match(/}$/); // Note: no comma
				});
			})
	);

	it('pass through simple documents (with delimeter)', ()=>
		exec(`o squish --delimiter=@ <${__dirname}/scenarios/users.json`, {json: false})
			.then(res => {
				expect(res).to.be.a('string');
				res = res.split(/@/).filter(Boolean);

				expect(res).to.have.length(7);
				res.forEach(line => {
					expect(line).to.be.a('string');
					expect(line).to.match(/^{/);
					expect(line).to.match(/}$/); // Note: no comma
				});
			})
	);

});
