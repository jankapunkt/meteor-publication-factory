import {Meteor} from 'meteor/meteor';
//import {Roles} from 'meteor/alanning:roles';
import {check, Match} from 'meteor/check';

export const PublicationFactory = {

	NO_PERMISSION: "No permission to collect data from this publication",
	NO_COLLECTION: "No collection provided for this publication.",
	NO_EMPTY_QUERY: "No empty queries are allowed",
	NO_VALID_QUERY:"No valid query provided.",

	checkUser(userId){
		if (!userId || !Meteor.users.findOne(userId))
			throw new Meteor.Error("403", this.NO_PERMISSION, userId);
		return true;
	},

	checkCollection(collection){
		if (!collection /* || ! collection instanceof Mongo.Collection */)
			throw new Meteor.Error("500", this.NO_COLLECTION);
		return true;
	},

	checkRoles(userId, roleNames, roleDomain) {
		if (!userId || !roleNames || !roleDomain) throw new Meteor.Error(this.NO_PERMISSION);
		const isInRoles = Roles.userIsInRole(userId, roleNames, roleDomain);
		if (!isInRoles) throw new Meteor.Error(this.NO_PERMISSION);
		return true;
	},


	_defaultLimit: 25,

	setDefaultLimit(value){
		check(value, Number);
		this._defaultLimit = value;
		return this;
	},


	_defaultSleep: 2000,

	setDefaultSleep(value) {
		check(value, Number);
		this._defaultSleep = value;
		return this;
	},

	createPublication(defObj) {
		const collection = defObj.collection;
		this.checkCollection(collection);

		const preventEmpty = !!(defObj.preventEmptyQuery);

		const querySchema = defObj.querySchema ? defObj.querySchema : null;

		const fieldsDef = defObj.fields || {};
		const filterDef = defObj.filter || {};
		const rolesDef = defObj.roles;
		const limitDef = defObj.limit || 0;
		const sleepDef = defObj.sleep || this._defaultSleep;

		const fieldsByRoleDef = defObj.fieldsByRole || null;

		const logger = defObj.logger;

		return function (selector = {}, limit = -1, sort = {}, skip = -1) {

			check(selector, Object);
			check(limit, Number);
			check(sort, Object);
			check(skip, Number);

			if (logger) {
				logger.call(logger, "---------------------------------------------");
				logger.call(logger, "Run publication ", selector, limit, sort, skip);
			}

			// first check access
			PublicationFactory.checkUser(this.userId);

			// check roles if present
			if (rolesDef)
				PublicationFactory.checkRoles(this.userId, rolesDef.names, rolesDef.domain);

			if (preventEmpty && Object.keys(selector).length === 0) {
				throw new Meteor.Error("403", PublicationFactory.NO_EMPTY_QUERY);
			}

			if (querySchema) {
				if (!Match.test(selector, querySchema))
					throw new Meteor.Error("403", PublicationFactory.NO_VALID_QUERY+ " given: " + JSON.stringify(selector) + " but required  " + JSON.stringify(querySchema));
			}

			// apply predefined filter
			selector = Object.assign({}, selector, filterDef);


			// if the current queue limit exceedes the default limit value
			// then sleep for a given time
			if (limit > limitDef)
				Meteor._sleepForMs(sleepDef);

			// create options obj
			const options = {};

			// apply limit or skip
			if (limit > 0) {
				options.limit = limit;
				if (skip > 0) {
					//options.skip = skip;
					options.limit += skip;
				}
			} else {
				options.limit = limitDef;
			}

			// apply which fields are visible
			if (fieldsDef && Object.keys(fieldsDef).length > 0)
				options.fields = fieldsDef;

			// additionally apply fields by role
			// and if user is in role
			if (fieldsByRoleDef) {
				// const rolesToMatch = Object.keys(fieldsByRoleDef);
				// TODO check roles and assign fields if matched
			}

			// apply sort
			if (sort && Object.keys(sort).length > 0)
				options.sort = sort;


			if (logger) {
				logger.call(logger, "Publication " + defObj.name + ": ask for " + [limit] + " documents:", this.userId, selector, options);
			}

			// query the data
			const data = collection.find(selector, options);

			// return if something has been found
			if (data && data.count() > 0) {
				if (logger)
					logger.call(logger, "Publication " + defObj.name + ": return documents - " + data.count() + "docs to " + this.userId);
				return data;
			}

			if (logger)
				logger.call(logger, "Publication " + defObj.name + ": no data found");

			// else signal the subscription
			// that we are ready
			this.ready();
		}
	}
}