var expect = require('chai').expect;
var exec = require('@momsfriendlydevco/exec');
var mlog = require('mocha-logger');
var setup = require('./setup');

describe('`o map` CLI (Lodash)', function() {
	this.timeout(10 * 1000);
	before(setup.initEnvironment);

	it('use _.keys extract available keys', ()=>
		exec(`o map _.keys <${__dirname}/scenarios/users.json`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				res.forEach(r => {
					expect(r).to.be.an('array');
					expect(r).to.include('name');
					expect(r).to.include('status');
				});
			})
	);

	// FIXME: Skipped for now as exec() chokes on brackets
	it.skip('use _.get to get a specific key', ()=>
		exec(`o map '_.get(#, "favourite.animal", "none")' <${__dirname}/scenarios/users.json`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				res.forEach(r => {
					expect(r).to.be.a('string');
					expect(r).to.be.oneOf(['dog', 'cat', 'squirrel', 'none']);
				});
			})
	);

	it('use _.size to count all documents within a collection', ()=>
		exec(`o map --collection _.size <${__dirname}/scenarios/users.json`, {json: true})
			.then(res => {
				expect(res).to.be.a('number');
				expect(res).to.be.equal(7);
			})
	)

	it('use _.size to count all documents within a collection (via thru)', ()=>
		exec(`o thru _.size <${__dirname}/scenarios/users.json`, {json: true})
			.then(res => {
				expect(res).to.be.a('number');
				expect(res).to.be.equal(7);
			})
	)

	// FIXME: Skipped for now as exec() chokes on brackets
	it.skip('use _.map to transform an entire collection', ()=>
		exec(`o map --collection '_.map(#, "favourite.animal")' <${__dirname}/scenarios/users.json`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				res.forEach(r => {
					expect(r).to.be.a('string');
					expect(r).to.be.oneOf(['dog', 'cat', 'squirrel', 'none']);
				});
			})
	)

});

// All these work but exec() chokes on the weird mix of syntax
describe.skip('`o map` CLI (ES6 Arrow functions)', function() {
	this.timeout(10 * 1000);
	before(setup.initEnvironment);

	it('pick from an array', ()=>
		exec('o map "doc => doc.name" <' + __dirname + '/scenarios/users.json', {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				res.forEach(d => {
					expect(d).to.be.an('string');
				});
			})
	);

	it('reduce an array', ()=>
		exec(`o map "doc => ({name: doc.name})"' <${__dirname}/scenarios/users.json`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				res.forEach(d => {
					expect(d).to.be.an('object');
					expect(Object.keys(d)).to.deep.match(['name']);
				});
			})
	);

	it('reduce an array concatting fields', ()=>
		exec(`o map 'doc => ({name: doc.name, favourites: \`\${doc.favourite.animal}, \${doc.favourite.color}\`})' <${__dirname}/scenarios/users.json`, {json: true})
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(7);
				res.forEach(d => {
					expect(d).to.be.an('object');
					expect(Object.keys(d)).to.deep.match(['name', 'favourties']);
				});
			})
	);

});
