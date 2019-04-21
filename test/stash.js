var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var setup = require('./setup');

describe('`o stash` CLI', function() {
	this.timeout(10 * 1000);
	before(setup.initEnvironment);

	it('should stash output', ()=>
		exec(`o select name <${__dirname}/scenarios/users.json | o stash -v --silent --save test`)
			.then(res => {
				expect(res).to.be.an('string');
				expect(res).to.have.length(0);
			})
	)

	it('should list stashes', ()=>
		exec('o stash -v --list', {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length.above(0);
				res.forEach(r => {
					expect(Object.keys(r)).to.deep.equal(['name', 'size', 'saved']);
				});
			})
	)

	it('should restore stashes', ()=>
		exec('o stash --load test', {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				res.forEach(r => {
					expect(Object.keys(r)).to.deep.equal(['name']);
				});
			})
	)

	it('should delete stashes', ()=>
		exec('o stash --delete test*')
			.then(res => {
				expect(res).to.be.a('string');
				expect(res).to.be.deep.equal('');
			})
	);

});
