Package.describe({
	name: 'jkuester:meteor-publication-factory',
	version: '0.1.4',
	// Brief, one-line summary of the package.
	summary: 'Factory for publications with access check and parameterization.',
	// URL to the Git repository containing the source code for this package.
	git: 'https://github.com/jankapunkt/meteor-publication-factory.git',
	// By default, Meteor will default to using README.md for documentation.
	// To avoid submitting documentation, set this field to null.
	documentation: 'README.md'
});

Package.onUse(function (api) {
	api.versionsFrom('1.5');
	api.use('ecmascript');
	api.use('meteor');
	api.use('check');
	api.use('mongo@1.1.19')
	api.use('alanning:roles@1.2.16');
	api.mainModule('meteor-publication-factory.js');
});

Package.onTest(function (api) {
	api.use('ecmascript');
	api.use('meteor');
	api.use('check');
	api.use('mongo@1.1.19')
	api.use('alanning:roles@1.2.16');
	api.use('random');
	api.use('practicalmeteor:chai');
	api.use('hwillson:stub-collections');
	api.use('jkuester:meteor-mocha-helpers@0.1.3');
	api.use('jkuester:meteor-publication-factory');
	api.mainModule('meteor-publication-factory-tests.js');
});
