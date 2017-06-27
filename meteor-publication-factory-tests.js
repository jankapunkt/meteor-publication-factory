// Import Tinytest from the tinytest Meteor package.
import { Tinytest } from "meteor/tinytest";

// Import and rename a variable exported by meteor-publication-factory.js.
import { name as packageName } from "meteor/jkuester:meteor-publication-factory";

// Write your tests here!
// Here is an example.
Tinytest.add('meteor-publication-factory - example', function (test) {
  test.equal(packageName, "meteor-publication-factory");
});
