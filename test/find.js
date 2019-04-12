var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var mlog = require('mocha-logger');
var setup = require('./setup');

describe('`o find` CLI', function() {
	this.timeout(60 * 1000); // 60s

	beforeEach(setup.init);
	afterEach(setup.teardown);

	it('should dry-run a query', ()=>
		exec([`${__dirname}/../o.js`, 'find', 'users', '--dry-run'], {logStderr: mlog.log, bufferStdout: true, json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(0);
			})
	);

	it('should find all users', ()=>
		exec([`${__dirname}/../o.js`, 'find', 'users'], {logStderr: mlog.log, bufferStdout: true, json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length.above(1);

				res.forEach(user => setup.validateUser(user));
			})
	)

	it('should find only the first two users', ()=>
		exec([`${__dirname}/../o.js`, 'find', 'users', '--limit=2'], {logStderr: mlog.log, bufferStdout: true, json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(2);

				res.forEach(user => setup.validateUser(user));
			})
	)

	it('should find only users with selected fields', ()=>
		exec([`${__dirname}/../o.js`, 'find', 'users', '--select=_id,name'], {logStderr: mlog.log, bufferStdout: true, json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length.above(0);
				res.forEach(user => expect(Object.keys(user).sort()).to.be.deep.equal(['_collection', '_id', 'name']));
			})
	)

	it('should find matching users via query (JSON)', ()=>
		exec([`${__dirname}/../o.js`, 'find', 'users', '{name: "Jane Quark"}'], {logStderr: mlog.log, bufferStdout: true, json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(1);
				expect(res[0]).to.have.property('name', 'Jane Quark');
				expect(res[0]).to.have.property('status', 'active');
				res.forEach(user => setup.validateUser(user));
			})
	)

	it('should find matching users via query (Key/Val)', ()=>
		exec([`${__dirname}/../o.js`, 'find', 'users', 'name=Jane Quark'], {logStderr: mlog.log, bufferStdout: true, json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(1);
				expect(res[0]).to.have.property('name', 'Jane Quark');
				expect(res[0]).to.have.property('status', 'active');
				res.forEach(user => setup.validateUser(user));
			})
	)

	it('should find matching users via query (--one + JSON)', ()=>
		exec([`${__dirname}/../o.js`, 'find', 'users', '--one', '{name: "Jane Quark"}'], {logStderr: mlog.log, bufferStdout: true, json: true})
			.then(res => {
				expect(res).to.be.an('object');
				expect(res).to.have.property('name', 'Jane Quark');
				expect(res).to.have.property('status', 'active');
				setup.validateUser(res);
			})
	)

	it('should find matching users via query (--one + Key/Val)', ()=>
		exec([`${__dirname}/../o.js`, 'find', 'users', '--one', 'name=Jane Quark'], {logStderr: mlog.log, bufferStdout: true, json: true})
			.then(res => {
				expect(res).to.be.an('object');
				expect(res).to.have.property('name', 'Jane Quark');
				expect(res).to.have.property('status', 'active');
				setup.validateUser(res);
			})
	)
});
