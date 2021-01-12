var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var setup = require('./setup');

describe('`o select` CLI', function() {
	this.timeout(10 * 1000);
	before(setup.initEnvironment);

	it('filter simple collection data', ()=>
		exec(['o', 'select', 'name', `<${__dirname}/scenarios/users.json`], {json: true, pipe: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				res.forEach(r => expect(Object.keys(r)).to.deep.equal(['name']));
			})
	);

});
