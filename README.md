<center>
<h1>jkuester:publication-factory - Meteor Publication Factory</h1>

[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)
[![Build Status](https://travis-ci.org/jankapunkt/meteor-publication-factory.svg?branch=master)](https://travis-ci.org/jankapunkt/meteor-publication-factory)
![GitHub](https://img.shields.io/github/license/jankapunkt/meteor-publication-factory.svg)

</center>

Super flexible and lightweight factory for creating publications using custom validators.

## Principle

First and foremost you want your publications to be created from config objects (similar to `mdg:validated-method`).

But of course, you want strong security for your publications  but also flexibility to choose, which technologies you
use to enforce this security.

Therefore, you write custom validators that apply for all publications, that are created using a factory instance.
You basically abstract your validations away, so your publications will only need configuration.

At the same time you want to focus your publication logic on the data layer, no checks, validations etc.
Therefore, you add a `run` function to your config, that only cares about which data to query from which collection
and how to transform if, finally returning a cursor.

That's it - separation of concerns together with a flexible dependency injection.

## Installation

```javascript
meteor add jkuester:publication-factory
```

## Changelog

2.0.0

* Major change using generic validators
* No binding to external packages


## Documentation

The factory is a configurable class, so you can create different factories using
different configurations.

### Minimal example

You can for example leave the config empty to create a minimal factory: 

```javascript
const factory = new PublicationFactory()
factory.create({
  name: 'allMyDocuments',
  run: function({ limit }) {
    const createdBy = this.userId
    return MyCollection.find({}, { createdBy, limit })
  }
})
```

In this base configuration there is no validation at all. If you want to add custom validations, 
you need to define custom validators and add them to the factory configuration.

### Writing Validators

A validator is a function that receives the create options and returns a validation function
based on these options:

```javascript
({}) => (...*) => undefined|throw
```

The validation function should throw an Error if validation fails, otherwise return undefined / no return.

The following example defines a validator for an arguments schema and
for user logged-in status:

```javascript
const validateArgs = function({ schema }) {
  if (!schema) throw new Error('expected schema') // makes the field required
  const schema = new SimpleSchema(schema)
  return function validate (...args) {
    schema.validate(...args)
  }
}

const validateUser = function({ name, isPublic }) {
  if (isPublic) return
  return function validate () {
    // this-context will be bound to the publication function
    // so we can access the user as in any normal publication
    const { userId } = this
    if (!userId || !Meteor.users.findOne(userId)) {
      throw new Meteor.Error(403, 'publication.permissionDenied', name)
    }
  }
}

const validators = [ validateArgs, validateUser ]
const factory = new PublicationFactory({ validators })
factory.create({
  name: 'allMyDocuments',
  isPublic: false,
  schema: { limit: Number },
  run: function({ limit }) {
    const createdBy = this.userId
    return MyCollection.find({}, { createdBy, limit })
  }
})
```

### Full Example

The following example creates a new publication and uses a custom validation for a user to have certain roles.
This involves a third party package (`alanning:roles`) and you are not bound to use this specific package, 
since the validators are up to you.

First we create the validators:

```javascript
const validateArgs = function() {
  return function validate (...args) {
    if (args.length > 0) throw new Error('expected no args')
  }
}

const validateRoles = function({ roles, group }) {
  if (!roles) return
  
 return function validate () {
   const { userId } = this
   if (!userId || !Roles.userIsInRoles(userId)) {
     throw new Meteor.Error(403, 'publication.permissionDenied', name)
   }
 }
}
```

Second, we create the factory while injecting the validators:

```javascript
const validators = [validateRoles]
const factory = new PublicationFactory({ validators })
```

Third, we create a specific publication using the factory:

```javascript
const Cars = new Mongo.Collection('cars');
const prototypeCars = factory.create({
  name: 'prototypeCars',
  roles: ['camViewPrototypes'],
  group: 'researchers',
  run: function() {
    return Cars.find({ isPrototype: true })
  }
})

// note that we could automatically publish using
// the `publish` flag in the config for factory.create
Meteor.publish('prototypeCars', prototypeCars)
```

## Testing

You can run the tests using the [test script](./tests.sh) or using the following bash line:

```bash
$ METEOR_PACKAGE_DIRS=../ TEST_WATCH=1 meteor test-packages ./ --driver-package meteortesting:mocha
```

## Contribution

Every contribution is very welcome. Feel free to raise an issue, if there is any problem with this package.

## License

MIT, see [license file](./LICENSE)