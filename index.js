#!/usr/bin/env node
'use strict'

module.exports = require('./lib')

if (!module.parent) {
  require('./lib/cli')(process.argv)
}
