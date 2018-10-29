<center>
<h1>jkuester:publication-factory - Meteor Publication Factory</h1>

[![Build Status](https://travis-ci.org/jankapunkt/meteor-publication-factory.svg?branch=master)](https://travis-ci.org/jankapunkt/meteor-publication-factory)

</center>

Supporter class to create publications from a source object with minimal to no extra code.

## Installation

```javascript
meteor add jkuester:publication-factory
```

## Changelog

1.2.1

* fix custom validator interference with defualt validators

1.2.0 (falsely named as 1.1.2)

* Allow to pass custom validator functions vor `query` and `projection` with fallback to internal default validation.

1.1.1

* fixed check to comply auditAllArguments and still accept undefined query / projection args from subscription

1.1.0

* lint fix using standardjs
* merged publication arguments from two to one on order to support single object args on subscriptions

## Principle

Pass in an object of your publication definitions with respect to the given API. 
The factory will return a function that is ready to be passed to `Meteor.publish` and will behave according to your 
configuration.

## API

The `create` functio requires at least an object, referred as `params` in this guide. 

Note, that `params.collectionName` is currently the only required property to be passed.
All other properties are optional! Such a publication would default to return all documents and accepts no args from subscriptions.

### All Parameters

The basic paramater pattern is
 
```javascript
PublicationFactory.create(params)
```

which can be fully broken down to the following schema:

```javascript
PublicationFactory.create({

  // the collection to be published
  collectionName: String,
  
  // define query behavior
  query: {
    
    // describe the allowed query args 
    // using a schema descriptiom
    schema: Object,
    
    // describe the default query, the server
    // will execute if no transform is applied
    server: Object,
    
    // provide a function that conditionally applies client
    // queries on server queries. You can also include strict
    // or loose security checks here as a third layer of security
    transform: Function
  },
  projection: {
    
    // describe the allowed projection args 
    // using a schema descriptiom
    schema: Object,
    
    // describe the default projection, the server
    // will execute if no transform is applied
    server: Object,
    
    // provide a function that conditionally applies client
    // projection on server projection. You can also include strict
    // or loose security checks here as a third layer of security
    transform: Function
        
  },
  security: {
    
    // explicitly disable authentication check
    // so the publication runs also for non-registered users
    disable: Boolean,
    
    // define roles that registered users need to comply
    // in order to publish. 
    roles: [String],
    
    // define a group that registered users need to comply
    // in order to publish.
    group: String,
  },
  validators: {
    
     // custom validation for the 
     // client side query
    query: Function, 
    
    // custom validation for the 
    // client side projection
    projection: Function, 
  }
})
```

### params.collectionName (String) 

Pass the name of a collection for which you want to publish data. If no other parameters are passed, the whole 
collection's data will be published.

#### Example

```javascript
const Cars = new Mongo.Collection('cars')

const allCars = PublicationFactory.create({
  collectionName: 'cars', // the collection to be published
})

// publishing this will
// return all cars, and 
// accept no args from subscriptions
Meteor.publish("allCars", allCars)
```

### params.query (Object)

You can define query behavior including transforming queries based on data, passed by clients.

#### params.query.server (Object)

You can define a static query using the `server` property. This is useful when your publication always publishes data 
by the same set of rules.

Falls back to `{}` if nothing is passed.

#### params.query.schema (Object)

Restrict client's query options using schema definition that is conform to `check/Match`.
Basic `SimpleSchema` definitions can be used, too, as they both follow the `property:Constructor` pattern. 

Complex restrictions however, can also be set using `Match` pattern.

#### params.query.transform (Function)

You can use this to define dynamic queries that respects users input and the default query on the server. You can also
perform additional checks here. 

Pass a function that accepts two parameters (`queryClient` - the current client's query object that is passed to the pub, 
`queryServer` - the default server query) and return your final query.

#### Example

```javascript
const Cars = new Mongo.Collection('cars');

const redCarsByYear = PublicationFactory.create({
  collectionName: 'cars', // the collection to be published
  query: {
    schema: { year: Number },
    server: { color: 'red' },
    transform(queryClient, queryServer) {
      return Object.assign({}, { year: { $gt: queryClient.year }, queryServer})
    }
  }
})

// this would create a publication that
// returns all car docs with color=red by a
// given year
Meteor.publish("redCarsByYear", redCarsByYear)
```

### params.projection (Object)

Works the same way as `params.query` but for the projection values. Use `transform` to add custom logic for handling 
`skip`, `limit` etc.

### params.security (Object)

The create method's parameter object accepts several security settings using the `security` property. 
By default each publication is checking `this.userId` against `Meteor.users` and throws an error if failing.

#### params.security.roles (String or [String])

Add roles (uses `alanning:roles`) and optional group definition to `security` to also check against roles. If no 
`roles` property is given, no roles check will be performed.

#### params.security.group (String)

Optional group definition as defined by `alanning:roles`. 

#### params.security.users ([String])

* You can add an array of user ids, named `users` to `security` in order to restrict for specific users.
This array can also be used in combination with `roles` where `roles` is first checked and then `users`. 
If a user passes the roles check but is not in the given pool of users, the check will fail. If no `users` property 
is given, no check will be performed.  

#### params.security.disable (Boolean)

* Add `disable:true` to  `security` in order to surpass all prior mentioned security checks. In this case anyone can 
subscribe to the publication and view data. Use with care!

#### Example


```javascript
const Cars = new Mongo.Collection('cars');

const prototypeCars = PublicationFactory.create({
  collectionName: 'cars', // the collection to be published
  security: {
    roles: ['viewPrototypes'],
    group: 'researchers',
    members: ['someUserIdHere'],
    disable: false,
  }
});


Meteor.publish("allToys", allToys);
```


### params.validators

With version 1.2.0 it is supported to pass in custom validators. 
This solves the problem of providing a way for validating complex structures while keeping the package free of external dependencies.

#### params.validators.query

Runs a function that provides the current client query against the expected schema.
Throw an error or return a falsey value in order to  

##### Example using SimpleSchema

Note, that SimpleSchema is optional to this package and needs to be installed, if you want to use it.

```javascript
const Cars = new Mongo.Collection('cars');

const carsByYearSchemaDefinition = { 
  year: Number,
  min: 1769,
  max: new Date().getFullYear() 
}

const carsByYearSchema = new SimplSchema(carsByYearSchemaDefinition)

const carsByYear = PublicationFactory.create({
  collectionName: 'cars', // the collection to be published
  query: {
    schema: carsByYearSchemaDefinition,
  },
  validators: {
    query(clientQuery, querySchema) {
      // throws error if not valid
      carsByYearSchema.validate(clientQuery)
      return true
    }
  }
});


Meteor.publish("carsByYear", carsByYear);
```

#### params.validators.projection

The same principles apply to this function as for `params.validators.query`

