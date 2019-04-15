var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var mlog = require('mocha-logger');
var setup = require('./setup');

describe('`o find` CLI', function() {
	this.timeout(60 * 1000); // 60s

	beforeEach(setup.init);
	afterEach(setup.teardown);

	it('should dry-run a query', ()=>
		exec([`${setup.o}`, 'find', 'users', '-vv', '--dry-run'], {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(0);
			})
	);

	it('should find all users', ()=>
		exec([`${setup.o}`, 'find', 'users', '-vv'], {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length.above(1);

				res.forEach(user => setup.validateUser(user));
			})
	)

	it('should find only the first two users', ()=>
		exec([`${setup.o}`, 'find', 'users', '--limit=2', '-vv'], {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(2);

				res.forEach(user => setup.validateUser(user));
			})
	)

	it('should find only users with selected fields', ()=>
		exec([`${setup.o}`, 'find', 'users', '--select=_id,name', '-vv'], {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length.above(0);
				res.forEach(user => expect(Object.keys(user).sort()).to.be.deep.equal(['_collection', '_id', 'name']));
			})
	)

	it('should find only active users', ()=>
		exec([`${setup.o}`, 'find', 'users', 'status=active', '-vvv'], {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(3);
				res.forEach(user => {
					expect(user).to.have.property('_id');
					expect(user).to.have.property('status', 'active');
				});
			})
	)

	it('should find matching users via query (JSON)', ()=>
		exec([`${setup.o}`, 'find', 'users', '{name: "Jane Quark"}', '-vv'], {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(1);
				expect(res[0]).to.have.property('name', 'Jane Quark');
				expect(res[0]).to.have.property('status', 'active');
				res.forEach(user => setup.validateUser(user));
			})
	)

	it('should find matching users via query (Key/Val)', ()=>
		exec([`${setup.o}`, 'find', 'users', 'name=Jane Quark', '-vv'], {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(1);
				expect(res[0]).to.have.property('name', 'Jane Quark');
				expect(res[0]).to.have.property('status', 'active');
				res.forEach(user => setup.validateUser(user));
			})
	)

	it('should find matching users via query (--one + JSON)', ()=>
		exec([`${setup.o}`, 'find', 'users', '--one', '{name: "Jane Quark"}', '-vv'], {json: true})
			.then(res => {
				expect(res).to.be.an('object');
				expect(res).to.have.property('name', 'Jane Quark');
				expect(res).to.have.property('status', 'active');
				setup.validateUser(res);
			})
	)

	it('should find matching users via query (--one + Key/Val)', ()=>
		exec([`${setup.o}`, 'find', 'users', '--one', 'name=Jane Quark', '-vv'], {json: true})
			.then(res => {
				expect(res).to.be.an('object');
				expect(res).to.have.property('name', 'Jane Quark');
				expect(res).to.have.property('status', 'active');
				setup.validateUser(res);
			})
	)
});
