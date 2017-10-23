/* eslint-env mocha */
import {Meteor} from 'meteor/meteor';
import {Match} from 'meteor/check';
import {Roles} from 'meteor/alanning:roles';
import {PublicationFactory} from 'meteor/jkuester:meteor-publication-factory';
import {MochaHelpers} from 'meteor/jkuester:meteor-mocha-helpers';
import {Random} from 'meteor/random';
import {chai, assert} from 'meteor/practicalmeteor:chai';

if (Meteor.isServer) {


	const factoryName = "dummy";
	const DummyCollection = MochaHelpers.crateDummyCollection(factoryName);
	DummyCollection.publicFields = {
		_id: 1,
		title: 1,
		description: 1,
	}
	const factoryProps = MochaHelpers.getDefaultPropsWith({});
	MochaHelpers.mockCollection(DummyCollection, factoryName, factoryProps);

	if (!Meteor.users)
		 Meteor.users = MochaHelpers.crateDummyCollection("users");

	describe("PublicationFactory - API", function () {


		const publish = function (publication) {
			const defaultPublication = PublicationFactory.createPublication(publication);
			MochaHelpers.isDefined(defaultPublication, 'function');
			Meteor.publish(publication.name, defaultPublication);
			MochaHelpers.isDefined(Meteor.server.publish_handlers[publication.name], MochaHelpers.FUNCTION);
			return defaultPublication;
		};

		const createDocument = (props = {}) => {
			const document = MochaHelpers.createMockDoc(factoryName, props);
			assert.typeOf(document, 'object');
		};

		let userId;
		let user;
		let userFct;
		let userName;
		let pubName;

		beforeEach(() => {

			userName = Random.id(17);

			userId = Random.id(17);
			pubName = Random.id(17);
			user = {
				_id: userId,
				username: userName,
				email: ""
			};
			Meteor.user = function () {
				return user;
			};
			Meteor.userId = function () {
				return userId;
			};
			Meteor.users.insert(user);
		});

		afterEach(() => {
			DummyCollection.remove({});
		});

		it("checks user", function () {
			assert.throws(function () {
				PublicationFactory.checkUser(null);
			}, PublicationFactory.NO_PERMISSION)

			assert.throws(function () {
				PublicationFactory.checkUser("");
			}, PublicationFactory.NO_PERMISSION)

			assert.throws(function () {
				PublicationFactory.checkUser(Random.id(17));
			}, PublicationFactory.NO_PERMISSION)

			assert.throws(function () {
				PublicationFactory.checkUser(null);
			}, PublicationFactory.NO_PERMISSION)

			assert.isTrue(PublicationFactory.checkUser(userId));
		})

		it("checks roles", function () {
			const names = ["can-test"];
			const domain = "testing";
			assert.throws(function () {
				PublicationFactory.checkRoles(null, null, null);
			}, PublicationFactory.NO_PERMISSION);

			assert.throws(function () {
				PublicationFactory.checkRoles(null, null, domain);
			}, PublicationFactory.NO_PERMISSION);

			assert.throws(function () {
				PublicationFactory.checkRoles(null, names, domain);
			}, PublicationFactory.NO_PERMISSION);

			assert.throws(function () {
				PublicationFactory.checkRoles(userId, names, domain);
			}, PublicationFactory.NO_PERMISSION);

			Roles.addUsersToRoles(userId, names, domain);
			assert.isTrue(PublicationFactory.checkRoles(userId, names, domain));
		})


		it("creates a minimal publication (name/collection)", function (done) {
			const pub = publish({
				name: pubName,
				collection: DummyCollection,
			});

			DummyCollection.insert({title: "test", description: "test"});
			DummyCollection.insert({title: "test", description: "test"});
			DummyCollection.insert({title: "test", description: "test"});
			MochaHelpers.collectPublication(userId, pubName, factoryName, 3, done);
		});

		it("creates extended pub - fields", function (done) {
			const pub = publish({
				name: pubName,
				collection: DummyCollection,
				fields: DummyCollection.publicFields,
			});

			DummyCollection.insert({title: "test", description: "test"});
			DummyCollection.insert({title: "test", description: "test"});
			DummyCollection.insert({title: "test", description: "test"});
			MochaHelpers.collectPublication(userId, pubName, factoryName, 3, done);
		});

		it("creates extended pub - filter", function (done) {
			publish({
				name: pubName,
				collection: DummyCollection,
				filter: {title: "foo"},
			});
			DummyCollection.insert({title: "test", description: "test"});
			DummyCollection.insert({title: "test", description: "test"});
			DummyCollection.insert({title: "test", description: "test"});
			DummyCollection.insert({title: "foo", description: "test"});
			MochaHelpers.collectPublication(userId, pubName, factoryName, 1, done);
		});

		it("creates extended pub - roles", function (done) {
			const roles = {
				domain: "tests",
				names: ['can-test'],
			};
			const pub = publish({
				name: pubName,
				collection: DummyCollection,
				roles: roles
			});
			assert.throws(function () {
				pub();
			}, PublicationFactory.NO_PERMISSION);

			// add user to roles
			Roles.addUsersToRoles(userId, roles.names, roles.domain);
			DummyCollection.insert({title: "test", description: "test"});
			DummyCollection.insert({title: "test", description: "test"});
			DummyCollection.insert({title: "test", description: "test"});
			MochaHelpers.collectPublication(userId, pubName, factoryName, 3, done);
		});


		it("creates extended pub - limit", function (done) {
			publish({
				name: pubName,
				collection: DummyCollection,
				limit: 1,
			});
			DummyCollection.insert({title: "test", description: "test"});
			DummyCollection.insert({title: "test", description: "test"});
			DummyCollection.insert({title: "test", description: "test"});
			MochaHelpers.collectPublication(userId, pubName, factoryName, 1, done);
		});

		it("creates extended pub - sleep", function (done) {
			publish({
				name: pubName,
				collection: DummyCollection,
				limit: 5000,
				sleep: 5000,
			});
			MochaHelpers.collectPublication(userId, pubName, factoryName, 0, done);
		});


		it ("prevents empty queries if set", function () {
			publish({
				name: pubName,
				collection: DummyCollection,
				limit: 5000,
				sleep: 5000,
				preventEmptyQuery: true
			});

			assert.throws(function () {
				MochaHelpers.collectPublication(userId, pubName, factoryName, 0, function (err) {
					throw err;
				});
			},  PublicationFactory.NO_EMPTY_QUERY);
		});

		it ("allows to define query schema", function (done) {
			publish({
				name: pubName,
				collection: DummyCollection,
				limit: 5000,
				sleep: 5000,
				querySchema: {_id: Match.OneOf(String, Object)},
			});

			assert.throws(function () {
				MochaHelpers.collectPublicationWithParams(userId, pubName, factoryName, {_id:123456}, 0, function (err) {
					throw err;
				});
			},  PublicationFactory.NO_VALID_QUERY);

			MochaHelpers.collectPublicationWithParams(userId, pubName, factoryName, {_id:{$in:[Random.id(), Random.id()]}}, 0, done);
		});


	});

}