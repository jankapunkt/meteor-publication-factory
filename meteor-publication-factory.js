import {Meteor} from 'meteor/meteor';


export const PublicationFactory = {

	_checkUserFct: null,
	NO_CHECK_FUNCTION: "Override this function with a custom check function first!",

	checkUser(userId){
		this._checkUserFct.call(this, userId);
	},

	setCheckUserFunction(fct) {
		this._checkUserFct = fct;
	},

	createPublication(collection, fields=null, limitValue = 50, sleepValue = 2000) {

		if (!collection /* || ! collection instanceof Mongo.Collection */)
			throw new Meteor.Error("No collection provided for this publication.");
		if (!this._checkUserFct)
			throw new Meteor.Error(this.NO_CHECK_FUNCTION);

		return function (filter, limit, sort) {

			// first check access
			PublicationFactory.checkUser(this.userId);

			if (!filter) filter = {};
			if (!limit) limit = limitValue;

			// if the current queue limit exceedes the default limit value
			// then sleep for a given time
			if (limit > limitValue)
				Meteor._sleepForMs(sleepValue);

			// create transform obj
			const transform = {};
			if (limitValue > 0) transform.limit = limit;
			if (fields && Object.keys(fields).length > 0) transform.fields = fields;
			if (sort && Object.keys(sort).length > 0) transform.sort = sort;

			// queue the data
			const data = collection.find(filter, transform);

			// return if something has been found
			if (data && data.count() > 0)
				return data;

			// else signal the subscription
			// that we are ready
			this.ready();
		}
	},
}