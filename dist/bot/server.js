/*
 * slack-bot
 * https://github.com/usubram/slack-bot
 *
 * Copyright (c) 2016 Umashankar Subramanian
 * Licensed under the MIT license.
 */

'use strict';

// Load modules

var http = require('http');
var path = require('path');
var root = '..';

var botLogger = require(path.join(root, 'utils/logger'));

var externals = {};
var internals = {
  defaultPort: 8080,
  defaultHost: '0.0.0.0'
};

externals.setupServer = function (config, handler) {
  var server = http.createServer(handler);
  var port = config.port || internals.defaultPort;
  var hostname = config.hostname || internals.defaultHost;

  return Promise.resolve({
    then: function then(success, failure) {
      server.listen(port, hostname, function () {
        botLogger.logger.info('Server listening on ', port, config.hostname);
        success(server);
      }).on('error', function (err) {
        botLogger.logger.log('Server setup error %j', err);
        failure(err);
      });
    }
  });
};

module.exports = externals;