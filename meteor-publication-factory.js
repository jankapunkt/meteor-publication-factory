/* global Roles */
import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import { check, Match } from 'meteor/check'

const isObject = x => typeof x === 'object'

export const DefaultValidators = {
  query (query, querySchema) {
    if (!querySchema && query) {
      return false
    }
    if (querySchema && !Match.test(query, querySchema)) {
      return false
    }
    return true
  },
  projection (projection, projectionSchema) {
    if (!projectionSchema && projection) {
      return false
    }
    if (projectionSchema && !Match.test(projection, projectionSchema)) {
      return false
    }
    return true
  }
}

export const PublicationFactory = {

  errors: {
    notInRole: 'publicationFactory.notInRole',
    userDenied: 'publicationFactory.userDenied',
    notMember: 'publicationFactory.notMember',
    noCollection: 'publicationFactory.noCollection',
    insufficientRolesDef: 'publicationFactory.insufficientRolesDef',
    insufficientMembersDef: 'publicationFactory.insufficientMembersDef',
    missingTransformValue: 'publicationFactory.missingTransformValue'
  },

  checkUser (userId) {
    if (!userId || !Meteor.users.findOne(userId)) {
      throw new Meteor.Error(this.errors.userDenied)
    }
    return true
  },

  checkCollection (collection) {
    if (!collection || !(collection instanceof Mongo.Collection)) {
      throw new Meteor.Error(this.errors.noCollection)
    }
    return true
  },

  checkRoles (userId, roleNames, roleDomain) {
    const isInRoles = Roles.userIsInRole(userId, roleNames, roleDomain)
    if (!isInRoles) {
      throw new Meteor.Error(this.errors.notInRole)
    }
    return true
  },

  checkIsMember (userId, userIds) {
    if (!userId || !userIds) {
      throw new Meteor.Error(this.errors.notMember)
    }
    const isMember = userIds.indexOf(userId) > -1
    if (!isMember) {
      throw new Meteor.Error(this.errors.notMember)
    }
    return true
  },

  _clientServerTransform: Match.Maybe({
    schema: Match.Maybe(Match.Where(isObject)),
    server: Match.Maybe(Match.Where(isObject)),
    transform: Match.Maybe(Function)
  }),

  create ({ collectionName, query = {}, projection = {}, security = {}, validators = {} }) {
    check(collectionName, String)
    check(query, this._clientServerTransform)
    check(projection, this._clientServerTransform)
    check(security, {
      roles: Match.Maybe(Match.OneOf(String, [ String ])),
      group: Match.Maybe(String),
      users: Match.Maybe([ String ]),
      disable: Match.Maybe(Boolean)
    })
    check(validators, {
      query: Match.Maybe(Function),
      projection: Match.Maybe(Function)
    })

    const Collection = Mongo.Collection.get(collectionName)
    this.checkCollection(Collection)

    const clientSchema = query.schema
    const queryServer = query.server || {}
    const queryTransform = query.transform || (() => queryServer)

    const projectionSchema = projection.schema
    const projectionServer = projection.server || {}
    const projectionTransform = projection.transform || (() => projectionServer)

    const noUserChecks = !!security.disable

    const { roles } = security
    const { group } = security

    if (typeof roles !== 'undefined' && roles.length === 0) {
      throw new Error(this.errors.insufficientRolesDef)
    }

    const { users } = security

    if (typeof users !== 'undefined' && users.length === 0) {
      throw new Error(this.errors.insufficientMembersDef)
    }

    return function (options) {
      check(options, Match.Where(opts => {
        if (!opts && (clientSchema || projectionSchema)) {
          return false
        }
        const queryValidator = (validators.query || DefaultValidators.query)
        if (!queryValidator(opts.query, clientSchema)) {
          return false
        }
        const projectionValidator = (validators.projection || DefaultValidators.projection)
        if (!projectionValidator(opts.projection, projectionSchema)) {
          return false
        }
        return true
      }))

      const clientQuery = options.query || {}
      const clientProjection = options.projection || {}

      // perform basic security checks
      // unless prevented by flag
      if (!noUserChecks) {
        PublicationFactory.checkUser(this.userId)
        if (roles) {
          PublicationFactory.checkRoles(this.userId, roles, group)
        }
        if (users) {
          PublicationFactory.checkIsMember(this.userId, users)
        }
      }

      const finalQuery = queryTransform.call(this, clientQuery, Object.assign({}, queryServer))
      const finalProjection = projectionTransform.call(this, clientProjection, Object.assign({}, projectionServer))

      if (!finalQuery || !finalProjection) {
        throw new Meteor.Error(PublicationFactory.errors.missingTransformValue)
      }

      const data = Collection.find(finalQuery, finalProjection)

      // return if something has been found
      if (data && data.count() >= 0) {
        return data
      }

      // else signal the subscription
      // that we are ready
      this.ready()
    }
  }
}
