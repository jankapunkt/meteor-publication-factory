import { Meteor } from 'meteor/meteor'
import { check, Match } from 'meteor/check'
import { createWarning, onErrorDefault, onWarningDefault } from './utils'

export class PublicationFactory {

  /**
   * Creates a new factory.
   * @param validators An array of Functions that run custom validations.
   * @param publish If true the create function will also publish the function
   * @param connection Pass a specific connection to publish
   * @param onWarning custom hook to pipe warnings
   * @param onError custom hook to pipe errors
   */
  constructor ({ validators = [], publish = false, connection = Meteor, onWarning = onWarningDefault, onError = onErrorDefault } = {}) {
    check(validators, [Function])
    check(publish, Boolean)
    check(connection.publish, Function)
    check(onError, Match.Maybe(Function))
    this.validators = validators
    this.publish = publish
    this.connection = connection
    this.onError = onError
    this.onWarning = onWarning
  }

  /**
   * Creates a new publication function for a given definitions.
   * @param definitions
   * @return {function} the created publication function
   */
  create (definitions) {
    check(definitions.name, String)
    check(definitions.run, Function)

    const factory = this
    const { name, run } = definitions
    const onError = definitions.onError || factory.onError
    const onWarning = definitions.onWarning || factory.onWarning

    // create validations based
    // on options and filter out undefined
    const toValidationFunction = validator => validator(definitions)
    const outUndefined = validate => !!validate
    const allValidations = factory.validators.map(toValidationFunction).filter(outUndefined)

    // raise a warning if no validators
    // are left after filtering
    if (allValidations.length === 0 && onWarning) {
      const warnText = createWarning(name)
      onWarning(warnText)
    }

    // create a wrapper for every publication, that
    // * validates the environment
    // * validates arguments
    // * validates users
    // based on given validators.
    // Errors are catched and passed to a given logger.
    //
    //
    const publicationFunction = function (...args) {
      check(args, Match.Any) // make audit all arguments happy
      const publication = this

      try {
        allValidations.every(validate => {
          validate.apply(publication, args)
        })

        const cursor = run.apply(publication, args)
        if (!cursor || typeof cursor.count !== 'function') {
          if (publication.ready) publication.ready()
          return
        }

        return cursor
      } catch (publicationRuntimeError) {
        if (onError) onError(name, publicationRuntimeError)
        publication.error(publicationRuntimeError)
        publication.ready()
      }
    }

    if (factory.publish) {
      factory.connection.publish(name, publicationFunction)
    }

    return publicationFunction
  }
}
