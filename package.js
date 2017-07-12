Package.describe({
	name: 'jkuester:meteor-publication-factory',
	version: '0.1.1',
	// Brief, one-line summary of the package.
	summary: '',
	// URL to the Git repository containing the source code for this package.
	git: '',
	// By default, Meteor will default to using README.md for documentation.
	// To avoid submitting documentation, set this field to null.
	documentation: 'README.md'
});

Package.onUse(function (api) {
	api.versionsFrom('1.5');
	api.use('ecmascript');
	api.use('meteor');
	api.use('alanning:roles@1.2.0');
	api.mainModule('meteor-publication-factory.js');
});

Package.onTest(function (api) {
	api.use('ecmascript');
	api.use('meteor');
	api.use('alanning:roles@1.2.0');
	api.use('random');
	api.use('practicalmeteor:chai');
	api.use('jkuester:meteor-mocha-helpers@0.1.1');
	api.use('jkuester:meteor-publication-factory');
	api.mainModule('meteor-publication-factory-tests.js');
});
