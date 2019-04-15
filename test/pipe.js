var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var mlog = require('mocha-logger');
var setup = require('./setup');

describe('Pipelines', function() {
	this.timeout(60 * 1000); // 60s

	beforeEach(setup.init);
	afterEach(setup.teardown);

	it('o find users | o select _id', ()=>
		exec(`${setup.o} find users -vv | ${setup.o} select _id -vv`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				res.forEach(user => expect(Object.keys(user).sort()).to.be.deep.equal(['_collection', '_id']));
			})
	)

	it('o find users | o limit 3', ()=>
		exec(`${setup.o} find users | ${setup.o} limit 3`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(3);
				res.forEach(user => setup.validateUser(user));
			})
	)

	it('o find users | o limit 3 | o select _id', ()=>
		exec(`${setup.o} find users | ${setup.o} limit 2 | ${setup.o} select _id`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(2);
				res.forEach(user => expect(Object.keys(user).sort()).to.be.deep.equal(['_collection', '_id']));
			})
	)

	it('o find users | o skip 1 | o limit 2 | o select _id', ()=>
		exec(`${setup.o} find users | ${setup.o} skip 1 | ${setup.o} limit 2 | ${setup.o} select _id`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(2);
				res.forEach(user => expect(Object.keys(user).sort()).to.be.deep.equal(['_collection', '_id']));
			})
	)

	it('o find users | o throttle --delay=1s | o progress --per=1', ()=> {
		var startTime = Date.now();
		return exec(`${setup.o} find users status=active | ${setup.o} throttle --delay=1s | ${setup.o} progress --per=1`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(3);
				expect(Date.now() - startTime).to.be.at.least(3000);
			})
	})

});
