/* eslint-env mocha */
import {PublicationFactory} from 'meteor/jkuester:meteor-publication-factory';
import {MochaHelpers} from 'meteor/jkuester:meteor-mocha-helpers';
import {Random} from 'meteor/random';
import {chai, assert} from 'meteor/practicalmeteor:chai';
import {Meteor} from 'meteor/meteor';

if (Meteor.isServer) {

	//const factoryProps = MochaHelpers.getDefaultPropsWith({});
	const factoryName = "dummy";
	const DummyCollection = MochaHelpers.crateDummyCollection(factoryName);

	//MochaHelpers.mockCollection(DummyCollection, factoryName, factoryProps);


	describe("PublicationFactory", function () {

		const createDocument = (props = {}) => {
			const document = MochaHelpers.createMockDoc(factoryName, props);
			assert.typeOf(document, 'object');
		};

		let userId;

		beforeEach(() => {
			//console.log("users:", Meteor.users);
			//Meteor.users.remove({username: "john doe"});
			//userId = Accounts.createUser({username: "john doe"});
			//DummyCollection.remove({});
			//_.times(3, () => createDocument(factoryProps));

		});

		afterEach(() => {
			//Meteor.users.remove({_id: userId});
		});

		it("checks user override", function () {
			PublicationFactory.setCheckUserFunction(null);
			assert.throws(function () {
				PublicationFactory.createPublication(DummyCollection)
			}, PublicationFactory.NO_CHECK_FUNCTION,);
		});

		it("creates a correct default publication", function (done) {
			PublicationFactory.setCheckUserFunction(function (userId) {
				return !!(userId); // TODO mock user
			})
			const pubName = Random.id(17);
			const defaultPublication = PublicationFactory.createPublication(DummyCollection);
			MochaHelpers.isDefined(defaultPublication, 'function');
			Meteor.publish(pubName, defaultPublication);
			MochaHelpers.collectPublication(userId, pubName, factoryName, 0, done);

		});

		// TODO test with documents

		// TODO test with user level permissions etc.
	});

}