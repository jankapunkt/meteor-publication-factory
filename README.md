# Meteor Publication Factory

Helps you to create standardized publications for common use cases.

## Usage

```javascript
const Toys = new Mongo.Collection("toys");

const allToys = PublicationFactory.createPublication({
		collection: Toys, // the collection to be published
		fields: { // the public fields
			title: 1,
			brand: 1,
			price: 1,
		},
		filter: { // a predefined filter
			brand: "Company A",
		},
		preventEmptyQueries: true, // throws err if publication is queries with {}
		querySchema: { // throws if query is not mathcing the schema
			_id:String,
		},
		roles: { // throws if user subscribes but is not in roles
			names: [ "read-toys" ],
			domain: "toystore",
		},
		limit: 20, // a default limit
		sleep: 2500, // a default sleep if limit is exceeded
		logger: function(...args) { // pass a custom function to log 
			// whatever you want to do here
		},
});


Meteor.publish("allToys", allToys);
```
