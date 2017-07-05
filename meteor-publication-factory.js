import {Meteor} from 'meteor/meteor';
import {Roles} from 'meteor/alanning:roles';

export const PublicationFactory = {

	NO_PERMISSION: "No permission to collect data from this publication",
	NO_COLLECTION: "No collection provided for this publication.",

	checkUser(userId){
		if (!userId || !Meteor.users.findOne(userId))
			throw new Meteor.Error(this.NO_PERMISSION);
		return true;
	},

	checkCollection(collection){
		if (!collection /* || ! collection instanceof Mongo.Collection */)
			throw new Meteor.Error(this.NO_COLLECTION);
		return true;
	},

	checkRoles(userId, roleNames, roleDomain) {
		if (!userId || !roleNames || !roleDomain) throw new Meteor.Error(this.NO_PERMISSION);
		const isInRoles = Roles.userIsInRole(userId, roleNames, roleDomain);
		if (!isInRoles) throw new Meteor.Error(this.NO_PERMISSION);
		return true;
	},

	createPublication(defObj) {
		const collection = defObj.collection;
		this.checkCollection(collection);

		const fieldsDef = defObj.fields || {};
		const filterDef = defObj.filter || {};
		const rolesDef = defObj.roles;
		const limitDef = defObj.limit || 50;
		const sleepDef = defObj.sleep || 2000;

		const logger = defObj.logger;

		return function (filter, limit, sort) {

			console.log("run publication " + defObj.name);

			// first check access
			PublicationFactory.checkUser(this.userId);

			// check roles if present
			if (rolesDef && rolesDef.length > 0)
				PublicationFactory.checkRoles(this.userId, rolesDef.names, rolesDef.domain);

			if (!filter) filter = {};
			filter = Object.assign({}, filter, filterDef);
			if (!limit || limit <= 0) limit = limitDef;

			// if the current queue limit exceedes the default limit value
			// then sleep for a given time
			if (limit > limitDef)
				Meteor._sleepForMs(sleepDef);

			// create transform obj
			const transform = {};
			if (limitDef > 0)
				transform.limit = limit;
			if (fieldsDef && Object.keys(fieldsDef).length > 0)
				transform.fields = fieldsDef;
			if (sort && Object.keys(sort).length > 0)
				transform.sort = sort;

			if (logger)
				logger.call("Publication " + defObj.name + ": ask for documents:" , this.userId, filter, transform);

			// queue the data
			const data = collection.find(filter, transform);

			// return if something has been found
			if (data && data.count() > 0){
				if (logger)
					logger.call("Publication " + defObj.name + ": return documents - " + data.count() + "docs to " + this.userId);
				return data;
			}

			if (logger)
				logger.call("Publication " + defObj.name + ": no data found");

			// else signal the subscription
			// that we are ready
			this.ready();
		}
	}
}