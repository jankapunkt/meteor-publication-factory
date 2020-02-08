/* eslint-env mocha */
import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { PublicationFactory } from 'meteor/jkuester:publication-factory'
import { Random } from 'meteor/random'
import { assert } from 'meteor/practicalmeteor:chai'
import {createWarning} from './utils'

describe('PublicationFactory', function () {
  describe('constructor', function () {
    it ('can be created without arguments', function () {
      const factory = new PublicationFactory()
      assert.equal(factory.connection, Meteor)
      assert.deepEqual(factory.validators, [])
      assert.equal(factory.publish, false)
      assert.equal(typeof factory.onError, 'function')
    })
    it ('can be created with arguments', function () {
      const validators = [function validator1() {}]
      const publish = true
      const connection = { publish: () => {} }
      const onError = () => {}
      const factory = new PublicationFactory({ validators, publish, connection, onError })
      assert.equal(factory.publish, true)
      assert.deepEqual(factory.validators, validators)
      assert.deepEqual(factory.onError, onError)
    })

  })

  describe('create', function () {
    let environment

    beforeEach(function () {
      environment = {
        _ready: undefined,
        _error: undefined,
        userId: Random.id()
      }
      environment.ready = () => { environment._ready = true }
      environment.error = (error) => { environment._error = error }
    })

    it ('throws if minimal options is not given', function () {
      const factory = new PublicationFactory()

      assert.throws(function () { factory.create() })
      assert.throws(function () { factory.create({ name: Random.id() }) })
      assert.throws(function () { factory.create({ run: () => {} }) })
    })
    it ('creates a warning if no validator is existent', function () {
      const name = Random.id()
      const warning = createWarning(name)
      const onWarning = (text) => {
        assert.equal(text, warning)
      }
      const factory = new PublicationFactory({ onWarning })
      factory.create({ name, run: () => {} })
    })
    it ('validates args if one or more validators are existent', function () {
      const id = Random.id()
      const errorMessage =  'invalid id'
      const validateArgs = function ({ expected }) {
        return function (...args) {
          const doc = args[0]
          if (!doc.id || doc.id !== expected.id) {
            throw new Error(errorMessage)
          }
        }
      }
      const onError = null
      const validators = [validateArgs]
      const factory = new PublicationFactory({ validators, onError })
      const publication = factory.create({
        name: Random.id(),
        expected:  { id },
        run: function ({ id }) {
          return id && { value: true, count: () => 0 }
        }
      })

      const valid = publication.call(environment, { id })
      assert.equal(valid.value, true)
      assert.equal(valid.count(), 0)

      const invalid = publication.call(environment, { id: Random.id() })
      assert.equal(invalid, undefined)
      assert.equal(environment._ready, true)
      assert.equal(environment._error.message, errorMessage)
    })
    it ('creates a new publication function', function () {
      const id1 = Random.id()
      const onWarning = null
      const factory = new PublicationFactory({ onWarning })
      const publication = factory.create({
        name: Random.id(),
        run: function ({ id }) {
          return { value: [id, id1], count: () => 2 }
        }
      })
      const id = Random.id()
      const actual = publication.call(environment, { id })
      assert.deepEqual(actual.value, [ id, id1])
      assert.deepEqual(actual.count(), 2)
    })
  })
})
