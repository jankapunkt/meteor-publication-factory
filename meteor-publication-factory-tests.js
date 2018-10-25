/* eslint-env mocha */
import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { PublicationFactory } from 'meteor/jkuester:publication-factory'
import { Random } from 'meteor/random'
import { assert } from 'meteor/practicalmeteor:chai'

class ExtendedCollection extends Mongo.Collection {}

function minimalExample () {
  const collectionId = Random.id()
  return {
    collectionName: new ExtendedCollection(collectionId)._name,
    query: {},
    projection: {},
    security: {},
    hooks: {}
  }
}

function asRegExp (errStr) {
  return new RegExp(errStr)
}

function missingKey (fieldName) {
  return asRegExp(`Missing key '${fieldName}'`)
}

if (Meteor.isServer) {
  describe('PublicationFactory', function () {
    let userId
    let userObj

    beforeEach(function () {
      userObj = { username: Random.id(), password: Random.id() }
      userId = Meteor.users.insert(userObj)
    })

    afterEach(function () {
      Meteor.users.remove({})
    })

    describe(PublicationFactory.checkUser.name, function () {
      it('throws on no given userId', function () {
        assert.throws(function () {
          PublicationFactory.checkUser()
        })
        assert.throws(function () {
          PublicationFactory.checkUser(null)
        })
        assert.throws(function () {
          PublicationFactory.checkUser(undefined)
        })
      })

      it('throws when no user exists for userId', function () {
        assert.throws(function () {
          PublicationFactory.checkUser(Random.id())
        })
      })

      it('returns true if the user exists by given userId', function () {
        assert.isTrue(PublicationFactory.checkUser(userId))
      })
    })

    describe(PublicationFactory.checkCollection.name, function () {
      it('throws if no collection is given', function () {
        assert.throws(function () {
          PublicationFactory.checkCollection()
        })
        assert.throws(function () {
          PublicationFactory.checkCollection(null)
        })
        assert.throws(function () {
          PublicationFactory.checkCollection(undefined)
        })
      })

      it('throws if the collection is not a Mongo.Collection', function () {
        assert.throws(function () {
          PublicationFactory.checkCollection({})
        })
        assert.throws(function () {
          PublicationFactory.checkCollection(function fakeCollection () {})
        })
      })

      it('returns true if it is an instance of a mongo collection', function () {
        assert.isTrue(PublicationFactory.checkCollection(new Mongo.Collection(Random.id())))
        assert.isTrue(PublicationFactory.checkCollection(new ExtendedCollection(Random.id())))
      })
    })

    describe(PublicationFactory.checkIsMember.name, function () {
      it('throws if userId is not in array or they don\'t exist', function () {
        assert.throws(function () {
          PublicationFactory.checkIsMember(userId, null)
        })
        assert.throws(function () {
          PublicationFactory.checkIsMember(null, [])
        })
        assert.throws(function () {
          PublicationFactory.checkIsMember(userId, [])
        })
        assert.throws(function () {
          PublicationFactory.checkIsMember(userId, [ Random.id(), Random.id() ])
        })
        assert.throws(function () {
          PublicationFactory.checkIsMember('', [])
        })
        assert.throws(function () {
          PublicationFactory.checkIsMember(null, [])
        })
        assert.throws(function () {
          PublicationFactory.checkIsMember(undefined, [])
        })
        assert.throws(function () {
          PublicationFactory.checkIsMember(null, [ Random.id() ])
        })
      })
    })

    describe('create', function () {
      describe('with minimal configuration', function () {
        it('throws on missing collection', function () {
          assert.throws(function () {
            PublicationFactory.create()
          }, /destructure/)

          assert.throws(function () {
            PublicationFactory.create({})
          }, /Expected string, got undefined/)
        })

        it('throws if given collection could not be found by name', function () {
          assert.throws(function () {
            PublicationFactory.create({
              collectionName: Random.id(),
              query: {
                server: {},
              },
              projection: {
                server: {},
              },
            })
          }, asRegExp(PublicationFactory.errors.noCollection))
        })

        it('returns a publication on minimal input', function () {
          const pub = PublicationFactory.create(minimalExample())
          assert.isDefined(pub)
          assert.isTrue(typeof pub === 'function')
        })
      })
    })

    describe('security settings and access checks', function () {
      describe('definitions', function () {
        it('throws if roles are defined but empty', function () {
          assert.throws(function () {
            const input = minimalExample()
            input.security = { roles: [] }
            PublicationFactory.create(input)
          }, asRegExp(PublicationFactory.errors.insufficientRolesDef))

          assert.throws(function () {
            const input = minimalExample()
            input.security = { roles: '' }
            PublicationFactory.create(input)
          }, asRegExp(PublicationFactory.errors.insufficientRolesDef))
        })

        it('throws if users (members) are defined but empty', function () {
          assert.throws(function () {
            const input = minimalExample()
            input.security = { users: [] }
            PublicationFactory.create(input)
          }, asRegExp(PublicationFactory.errors.insufficientMembersDef))
        })
      })

      describe('runtime', function () {
        it('allows none arguments or an empty object as arguments', function () {
          assert.throws(function () {
            const pub = PublicationFactory.create(minimalExample())
            pub({})
          }, asRegExp(PublicationFactory.errors.userDenied))
        })

        it('throws if user is not logged in or fake user', function () {
          assert.throws(function () {
            const pub = PublicationFactory.create(minimalExample())
            pub({})
          }, asRegExp(PublicationFactory.errors.userDenied))

          assert.throws(function () {
            const pub = PublicationFactory.create(minimalExample()).bind({ userId: Random.id() })
            pub({})
          }, asRegExp(PublicationFactory.errors.userDenied))
        })

        it('throws if user is not in roles and roles are given', function () {
          const roles = [ Random.id() ]
          const group = Random.id()

          const input = minimalExample()
          input.security = { roles, group }

          assert.throws(function () {
            const pub = PublicationFactory.create(input).bind({ userId })
            pub({})
          }, asRegExp(PublicationFactory.errors.notInRole))
        })

        it('throws if user is not member and users as restricted pool are given', function () {
          const input = minimalExample()
          input.security = { users: [ Random.id(), Random.id() ] }

          assert.throws(function () {
            const pub = PublicationFactory.create(input).bind({ userId })
            pub({})
          }, asRegExp(PublicationFactory.errors.notMember))
        })

        it('allows to surpass runtime security checks using the disable:true flag', function () {
          const input = minimalExample()
          input.security = { disable: true }

          const Collection = Mongo.Collection.get(input.collectionName)
          for (let i = 0; i < 5; i++) {
            Collection.insert({})
          }
          const expectedCount = Collection.find().count()

          const pub = PublicationFactory.create(input).bind({ userId })
          const cursor = pub({})
          assert.equal(cursor.count(), expectedCount)
        })
      })
    })

    describe('with client side definitions', function () {
      it('throws if client side query/projection is defined and does not match actual client input', function () {
        assert.throws(function () {
          const input = minimalExample()
          input.security = { disable: true }
          input.query.schema = { createdBy: String }
          const pub = PublicationFactory.create(input).bind({ userId })
          pub({})
        } /*, missingKey('createdBy') */)
      })
    })

    describe('with transform functions', function () {
      it('throws if transform function has no return value', function () {
        assert.throws(function () {
          const input = minimalExample()
          input.security = { disable: true }
          input.query = {
            schema: { index: Number },
            server: { createdBy: userId },
            transform () {},
          }
          const pub = PublicationFactory.create(input).bind({ userId })
          pub({ query: { index: 1 } })
        }, asRegExp(PublicationFactory.errors.missingTransformValue))
      })

      it('allows to transform the query', function () {
        const input = minimalExample()
        input.security = { disable: true }
        input.query = {
          schema: { index: Number },
          server: { createdBy: userId },
          transform (qClient, qServer) {
            const max = qClient.index
            return Object.assign({}, { index: { $gt: max } }, qServer)
          },
        }

        const Collection = Mongo.Collection.get(input.collectionName)
        for (let i = 0; i < 5; i++) {
          Collection.insert({ index: i, createdBy: i % 2 ? userId : Random.id() })
        }

        const pub = PublicationFactory.create(input).bind({ userId })
        const cursor = pub({ query: { index: 1 } })
        assert.equal(cursor.count(), 1)

        const doc = cursor.fetch()[ 0 ]
        assert.equal(doc.index, 3)
      })

      it('cannot mutate the default queryServer', function () {
        const input = minimalExample()
        input.security = { disable: true }
        input.query = {
          schema: { index: Number },
          server: { createdBy: userId },
          transform (qClient, qServer) {
            const max = qClient.index
            const result = Object.assign({}, { index: { $gt: max } }, qServer)
            delete qServer.createdBy // eslint-disable-line no-param-reassign
            return result
          },
        }

        const Collection = Mongo.Collection.get(input.collectionName)
        for (let i = 0; i < 5; i++) {
          Collection.insert({ index: i, createdBy: i % 2 ? userId : Random.id() })
        }

        const pub = PublicationFactory.create(input).bind({ userId })

        // first run with override attempt
        assert.equal(pub({ query: { index: 1 } }).count(), 1)

        // second run
        assert.equal(pub({ query: { index: 1 } }).count(), 1)
      })
    })
  })
}
