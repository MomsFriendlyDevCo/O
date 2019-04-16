var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var mlog = require('mocha-logger');
var setup = require('./setup');

describe('Pipelines', function() {
	this.timeout(60 * 1000); // 60s

	before(setup.init);
	after(setup.teardown);

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

	it('o find users | o throttle --delay=1s | o progress --per=1 | o pluck _id', ()=> {
		var startTime = Date.now();
		return exec(`${setup.o} find users status=active | ${setup.o} throttle --delay=1s | ${setup.o} progress --per=1 | ${setup.o} pluck _id`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(3);
				res.forEach(r => {
					expect(r).to.be.a('string');
					expect(r).to.match(/^[0-9a-f]{24}/);
				})
				expect(Date.now() - startTime).to.be.at.least(3000);
			})
	})

	it('o find users | o filter status=active', ()=>
		exec(`${setup.o} find users | ${setup.o} filter status=active'`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(3);
				res.forEach(user => expect(user).to.have.property('status', 'active'));
			})
	)

	it('o find users status=deleted | o set status=active', ()=>
		exec(`${setup.o} find users status=deleted | ${setup.o} set status=active'`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(2);
				res.forEach(user => expect(user).to.have.property('status', 'active'));
			})
	)

	it('o find users | o set "name=Fake ${name}"', ()=>
		exec(`${setup.o} find users | ${setup.o} filter status=active | ${setup.o} set "name=Fake\${name}"`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(3);
				res.forEach(user => {
					expect(user).to.have.property('status', 'active');
					expect(user).to.have.property('name');
					expect(user.name).to.match(/^Fake/);
				});
			})
	)

	it('o find users status=active | o populate company', ()=>
		exec(`${setup.o} find users status=active | ${setup.o} populate company`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(3);
				res.forEach(user => {
					expect(user).to.have.property('status', 'active');
					expect(user).to.have.property('company');
					expect(user.company).to.be.an('object');
				});
			})
	)

});
