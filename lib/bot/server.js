/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules
const http = require('http');
const url = require('url');

const internals = {
  defaultPort: 8080
}
const externals = {};

exports = module.exports.setupServer = externals.setupServer = function (config, handler, callback) {
  var server = http.createServer(handler);
  var port = config.port || internals.defaultPort;
  server.listen(port, config.hostname, function () {
    callback(null, server);
    /* jshint ignore:start */
    console.log('Server listening on ', port, config.hostname);
    /* jshint ignore:end */
  }).on('error', function (err) {
    if (err) {
      throw new Error(err);
    }
    callback(true);
  });
};
