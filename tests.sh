#!/usr/bin/env bash
METEOR_PACKAGE_DIRS=../ TEST_WATCH=1 meteor test-packages ./ --driver-package meteortesting:mocha