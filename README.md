# Meteor Publication Factory

Helps you to create standardized publications for common use cases.

## Usage

```javascript
const Toys = new Mongo.Collection("toys");

const allToys = PublicationFactory.createPublication({
		collection: Toys,
		fields: {
			title: 1,
			brand: 1,
			price: 1,
		},
		filter: {
			brand: "Company A",
		},
		roles: {
			names: [ "read-toys" ],
			domain: "toystore",
		},
		limit: 20,
		sleep: 2500,
		logger: function(...args) {
			// whatever you want to do here
		},
});


Meteor.publish("allToys", allToys);
```
