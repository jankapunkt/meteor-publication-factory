/* global Package */

Package.describe({
  name: 'jkuester:publication-factory',
  version: '1.1.0',
  // Brief, one-line summary of the package.
  summary: 'Factory for dynamic publications with config, access checks and hooks.',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/jankapunkt/meteor-publication-factory.git',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
})

Package.onUse(function (api) {
  api.versionsFrom('1.5')
  api.use('ecmascript')
  api.use('meteor')
  api.use('check')
  api.use('mongo@1.1.19')
  api.use('alanning:roles@1.2.16')
  api.use('dburles:mongo-collection-instances@0.3.5')
  api.mainModule('meteor-publication-factory.js')
})

Package.onTest(function (api) {
  api.use('ecmascript')
  api.use('meteor')
  api.use('check')
  api.use('mongo@1.1.19')
  api.use('alanning:roles@1.2.16')
  api.use('random')
  api.use('practicalmeteor:chai')
  api.use('hwillson:stub-collections')
  api.use('jkuester:meteor-mocha-helpers')
  api.use('meteortesting:mocha')
  api.use('jkuester:publication-factory')
  api.mainModule('meteor-publication-factory-tests.js')
})
